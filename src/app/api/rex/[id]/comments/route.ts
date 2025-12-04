import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch comments for a REX
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rexId } = await params;
    const supabase = await createClient();

    // Fetch all comments for this REX with author info
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!author_id(id, full_name, grade, avatar_url, role)
      `)
      .eq('rex_id', rexId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Comments fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Organize comments into threads (parent comments with replies)
    const parentComments = comments?.filter(c => !c.parent_id) || [];
    const replies = comments?.filter(c => c.parent_id) || [];

    const threaded = parentComments.map(parent => ({
      ...parent,
      replies: replies
        .filter(r => r.parent_id === parent.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));

    return NextResponse.json({ data: threaded });
  } catch (error) {
    console.error('Comments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rexId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { content, parent_id, mentions } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        rex_id: rexId,
        author_id: user.id,
        parent_id: parent_id || null,
        content: content.trim(),
        mentions: mentions || [],
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, grade, avatar_url, role)
      `)
      .single();

    if (error) {
      console.error('Comment create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Create notifications for mentioned users
    if (mentions && mentions.length > 0) {
      // Future: Insert notifications for each mentioned user
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error('Comment create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
