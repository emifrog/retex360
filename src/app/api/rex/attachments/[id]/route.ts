import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { removeAttachmentObjects, thumbnailPathFor } from '@/lib/storage';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get attachment
    const { data: attachment, error: fetchError } = await supabase
      .from('rex_attachments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Pièce jointe non trouvée' }, { status: 404 });
    }

    // Check ownership
    if (attachment.uploaded_by !== user.id) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
    }

    // Delete from storage (original + thumbnail) with the service role so an
    // admin can remove files uploaded by another user (own-folder storage
    // policy would otherwise block it). Authorization is enforced above.
    await removeAttachmentObjects([
      attachment.storage_path,
      thumbnailPathFor(attachment.storage_path),
    ]);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('rex_attachments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Database delete error:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Attachment delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
