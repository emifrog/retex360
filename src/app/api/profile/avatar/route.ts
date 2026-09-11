import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { optimizeImage } from '@/lib/image-optimizer';
import { verifyFileType } from '@/lib/file-signature';
import { logger } from '@/lib/logger';
import { requireUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.upload, user.id);
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Pré-filtre sur le type annoncé — pas de SVG (XSS stocké en bucket public)
    // ni GIF. Ne vaut PAS validation : voir le contrôle du contenu ci-dessous.
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non autorisé (JPEG, PNG ou WebP)' },
        { status: 400 }
      );
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image ne doit pas dépasser 2 Mo" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Contrôle du CONTENU avant toute mise en décodeur : `file.type` est
    // déclaratif, Sharp détecte le format par les octets. Le pré-filtre
    // ci-dessus garantit que le type déclaré est l'un des trois autorisés, et
    // cette égalité garantit que le contenu réel l'est aussi.
    //
    // Placé AVANT la suppression de l'ancien avatar : un fichier refusé ne doit
    // pas laisser le profil sans image.
    const typeCheck = verifyFileType(originalBuffer, file.type);
    if (!typeCheck.ok) {
      logger.warn('Avatar rejeté : le contenu ne correspond pas au type déclaré', {
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

    // Delete old avatar if exists
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (currentProfile?.avatar_url) {
      // Extract storage path from the public URL
      const oldPath = currentProfile.avatar_url.split('/avatars/').pop();
      if (oldPath) {
        await supabase.storage.from('avatars').remove([`avatars/${oldPath}`]);
      }
    }

    // Re-encode server-side (neutralise toute charge embarquée) + extension
    // dérivée du type vérifié, jamais du nom de fichier client.
    const optimized = await optimizeImage(originalBuffer, typeCheck.type);
    const fileName = `${user.id}-${Date.now()}.webp`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, optimized.buffer, {
        contentType: optimized.contentType,
        upsert: true,
      });

    if (uploadError) {
      logger.error('Upload error:', uploadError);
      return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    logger.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
