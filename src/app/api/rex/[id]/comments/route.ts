import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { commentSchema } from '@/lib/validators/api';
import { sanitizePlainText } from '@/lib/sanitize-server';

// GET - Fetch comments for a REX
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rexId } = await params;
    const supabase = await createClient();

    // Fetch all comments for this REX with author info
    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        author:profiles!author_id(id, full_name, grade, avatar_url, role)
      `
      )
      .eq('rex_id', rexId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Comments fetch error:', error);
      return NextResponse.json(
        { error: 'Erreur lors du chargement des commentaires' },
        { status: 500 }
      );
    }

    // Organize comments into threads (parent comments with replies)
    const parentComments = comments?.filter((c) => !c.parent_id) || [];
    const replies = comments?.filter((c) => c.parent_id) || [];

    const threaded = parentComments.map((parent) => ({
      ...parent,
      replies: replies
        .filter((r) => r.parent_id === parent.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));

    return NextResponse.json({ data: threaded });
  } catch (error) {
    logger.error('Comments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const { id: rexId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input (content length, parent_id/mentions as UUIDs, mentions cap)
    const validated = commentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    // Strip any HTML (comments are plain text) and dedupe mentions, excluding self.
    const content = sanitizePlainText(validated.data.content).trim();
    if (!content) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }
    const parent_id = validated.data.parent_id ?? null;
    const mentions = [...new Set(validated.data.mentions)].filter((mid) => mid !== user.id);

    // Create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        rex_id: rexId,
        author_id: user.id,
        parent_id,
        content,
        mentions,
      })
      .select(
        `
        *,
        author:profiles!author_id(id, full_name, grade, avatar_url, role)
      `
      )
      .single();

    if (error) {
      logger.error('Comment create error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du commentaire' },
        { status: 500 }
      );
    }

    // Get REX info and commenter info for notifications
    const { data: rex } = await supabase
      .from('rex')
      .select('author_id, title')
      .eq('id', rexId)
      .single();

    const { data: commenter } = await supabase
      .from('profiles')
      .select('full_name, grade')
      .eq('id', user.id)
      .single();

    const commenterName = commenter?.grade
      ? `${commenter.grade} ${commenter.full_name}`
      : commenter?.full_name || 'Un utilisateur';

    // Notifications destinées à d'autres utilisateurs : insérées via le client
    // admin (service role). La RLS interdit désormais à un client utilisateur de
    // créer des notifications pour autrui ; l'autorisation est garantie ici (le
    // commentaire vient d'être créé par cet utilisateur).
    const notifClient = createAdminClient();

    // Notify REX author if someone else comments
    if (rex && rex.author_id !== user.id) {
      await notifClient.from('notifications').insert({
        user_id: rex.author_id,
        type: 'comment',
        title: `${commenterName} a commenté votre RETEX`,
        content: rex.title,
        link: `/rex/${rexId}#comments`,
      });
    }

    // Notify mentioned users — only those that actually exist, to avoid spamming
    // notifications via forged user ids (and to keep the batch insert valid).
    if (mentions.length > 0) {
      const { data: realProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', mentions);

      const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '');
      const mentionNotifications = (realProfiles || []).map(({ id: mentionedId }) => ({
        user_id: mentionedId,
        type: 'mention',
        title: `${commenterName} vous a mentionné`,
        content: preview,
        link: `/rex/${rexId}#comments`,
      }));

      if (mentionNotifications.length > 0) {
        await notifClient.from('notifications').insert(mentionNotifications);
      }
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    logger.error('Comment create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
