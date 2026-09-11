import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { optimizeImage, generateThumbnail } from '@/lib/image-optimizer';
import { isAllowedMimeType, verifyFileType, type AllowedMimeType } from '@/lib/file-signature';
import { logger } from '@/lib/logger';
import {
  signAttachmentUrl,
  putAttachmentObject,
  removeAttachmentObjects,
  thumbnailPathFor,
} from '@/lib/storage';

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rateLimitResult = await rateLimiters.upload.limit(ip);

  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset);
  }

  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rexId = formData.get('rexId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (rexId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rexId)) {
      return NextResponse.json({ error: 'Identifiant REX invalide' }, { status: 400 });
    }

    // Pré-filtre sur le type annoncé : évite de charger en mémoire un fichier
    // dont on sait déjà qu'il sera refusé. Ne vaut PAS validation — voir le
    // contrôle du contenu ci-dessous.
    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
    }

    // Validate file size (10MB max for originals — will be compressed)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 10 Mo' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Contrôle du CONTENU avant toute mise en décodeur : `file.type` est
    // déclaratif, Sharp détecte le format par les octets. Sans ce test, un
    // HEIF/AVIF annoncé `image/jpeg` passe le filtre ci-dessus et atteint
    // libheif.
    const typeCheck = verifyFileType(originalBuffer, file.type);
    if (!typeCheck.ok) {
      logger.warn('Upload rejeté : le contenu ne correspond pas au type déclaré', {
        userId: user.id,
        declared: file.type,
        detected: typeCheck.detected,
        reason: typeCheck.reason,
      });
      return NextResponse.json(
        { error: 'Le contenu du fichier ne correspond pas à son type déclaré' },
        { status: 400 }
      );
    }
    // À partir d'ici, plus aucune décision ne dépend du type déclaré.
    const fileType = typeCheck.type;

    // Optimize image (compress + resize + convert to WebP)
    const optimized = await optimizeImage(originalBuffer, fileType);

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const isImage = fileType.startsWith('image/') && fileType !== 'image/gif';
    // Extension dérivée du type réel (jamais du nom de fichier client). Le
    // Record est exhaustif sur `AllowedMimeType` : un format ajouté à la liste
    // blanche sans extension associée échoue à la compilation.
    const MIME_EXT: Record<AllowedMimeType, string> = {
      'application/pdf': 'pdf',
      'image/gif': 'gif',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = optimized.contentType === 'image/webp' ? 'webp' : MIME_EXT[fileType];
    const baseName = `${user.id}/${timestamp}-${randomSuffix}`;
    const storagePath = `rex-attachments/${baseName}.${ext}`;

    // Upload optimized image to object storage (Scaleway S3 or Supabase)
    const uploaded = await putAttachmentObject(
      storagePath,
      optimized.buffer,
      optimized.contentType
    );
    if (!uploaded) {
      logger.error('Upload error', { storagePath });
      return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }

    // Generate and upload thumbnail for images
    let thumbnailUrl: string | null = null;
    if (isImage) {
      const thumbnail = await generateThumbnail(originalBuffer, fileType);
      if (thumbnail) {
        const thumbPath = `rex-attachments/${baseName}_thumb.webp`;
        const thumbOk = await putAttachmentObject(thumbPath, thumbnail.buffer, 'image/webp');
        if (!thumbOk) {
          logger.error('Thumbnail upload error', { thumbPath });
          // Non-blocking: continue without thumbnail
        } else {
          // Bucket is private — return a short-lived signed URL.
          thumbnailUrl = await signAttachmentUrl(thumbPath);
        }
      }
    }

    // Signed URL for the just-uploaded file (bucket is private).
    const fileUrl = await signAttachmentUrl(storagePath);

    // Save to database
    const { data: attachment, error: dbError } = await supabase
      .from('rex_attachments')
      .insert({
        rex_id: rexId || null,
        uploaded_by: user.id,
        file_name: file.name,
        file_type: optimized.contentType,
        file_size: optimized.optimizedSize,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Database error:', dbError);
      // Clean up uploaded files
      await removeAttachmentObjects([storagePath, thumbnailPathFor(storagePath)]);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
    }

    return NextResponse.json({
      id: attachment.id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      file_size: attachment.file_size,
      storage_path: attachment.storage_path,
      url: fileUrl,
      thumbnail_url: thumbnailUrl,
    });
  } catch (error) {
    logger.error('Attachment upload error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
