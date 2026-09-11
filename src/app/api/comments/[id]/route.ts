import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isSdisAdmin, requireUser } from '@/lib/api-auth';
import { toOne } from '@/lib/supabase/relations';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { commentSchema } from '@/lib/validators/api';
import { sanitizePlainText } from '@/lib/sanitize-server';

// PUT - Update a comment
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: commentId } = await params;
    const supabase = await createClient();

    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.api, user.id);
    if (limited) return limited;

    // Check if user is the author
    const { data: existingComment } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', commentId)
      .single();

    if (!existingComment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    if (existingComment.author_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();

    const validated = commentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const content = sanitizePlainText(validated.data.content).trim();
    if (!content) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .update({
        content,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(
        `
        *,
        author:profiles!author_id(id, full_name, grade, avatar_url, role)
      `
      )
      .single();

    if (error) {
      logger.error('Comment update error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la modification du commentaire' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: comment });
  } catch (error) {
    logger.error('Comment update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const supabase = await createClient();

    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.api, user.id);
    if (limited) return limited;

    // Check if user is the author or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, sdis_id')
      .eq('id', user.id)
      .single();

    // The parent REX's SDIS scopes the admin check (mirrors the RLS DELETE
    // policy added in migration 021).
    const { data: existingComment } = await supabase
      .from('comments')
      .select('author_id, rex:rex_id(sdis_id)')
      .eq('id', commentId)
      .single();

    if (!existingComment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    const parentRex = toOne<{ sdis_id: string | null }>(existingComment.rex);
    const isAdmin = isSdisAdmin(profile, parentRex?.sdis_id);
    const isAuthor = existingComment.author_id === user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Delete the comment (and its replies via cascade).
    // `.select()`: an RLS-blocked delete returns 0 rows and NO error — without
    // this the route would answer "supprimé" while nothing happened.
    const { data: deleted, error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .select('id');

    if (error) {
      logger.error('Comment delete error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du commentaire' },
        { status: 500 }
      );
    }

    if (!deleted || deleted.length === 0) {
      logger.warn('Comment delete blocked by RLS', { commentId, userId: user.id });
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Comment delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
