import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { optimizeImage, generateThumbnail } from '@/lib/image-optimizer';
import { logger } from '@/lib/logger';
import { signAttachmentUrl, putAttachmentObject, removeAttachmentObjects, thumbnailPathFor } from '@/lib/storage';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rexId = formData.get('rexId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
    }

    // Validate file size (10MB max for originals — will be compressed)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 10 Mo' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Optimize image (compress + resize + convert to WebP)
    const optimized = await optimizeImage(originalBuffer, file.type);

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const isImage = file.type.startsWith('image/') && file.type !== 'image/gif';
    const ext = optimized.contentType === 'image/webp' ? 'webp' : file.name.split('.').pop();
    const baseName = `${user.id}/${timestamp}-${randomSuffix}`;
    const storagePath = `rex-attachments/${baseName}.${ext}`;

    // Upload optimized image to object storage (Scaleway S3 or Supabase)
    const uploaded = await putAttachmentObject(storagePath, optimized.buffer, optimized.contentType);
    if (!uploaded) {
      logger.error('Upload error', { storagePath });
      return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }

    // Generate and upload thumbnail for images
    let thumbnailUrl: string | null = null;
    if (isImage) {
      const thumbnail = await generateThumbnail(originalBuffer, file.type);
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
