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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
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

    // Delete the row FIRST. PostgREST reports an RLS-blocked delete as 0 rows
    // WITHOUT an error, so purging storage first would destroy the file while
    // the row survives — an irreversible loss reported to the client as success.
    const { data: deleted, error: deleteError } = await supabase
      .from('rex_attachments')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      logger.error('Database delete error:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    if (!deleted || deleted.length === 0) {
      logger.warn('Attachment delete blocked by RLS', { attachmentId: id, userId: user.id });
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Storage cleanup once the database has confirmed the deletion. Uses the
    // service role so an admin can remove a file uploaded by another user (the
    // own-folder storage policy would otherwise block it).
    await removeAttachmentObjects([
      attachment.storage_path,
      thumbnailPathFor(attachment.storage_path),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Attachment delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
