import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update a comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

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
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        *,
        author:profiles!author_id(id, full_name, grade, avatar_url, role)
      `)
      .single();

    if (error) {
      console.error('Comment update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: comment });
  } catch (error) {
    console.error('Comment update error:', error);
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check if user is the author or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const { data: existingComment } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', commentId)
      .single();

    if (!existingComment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    const isAuthor = existingComment.author_id === user.id;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Delete the comment (and its replies via cascade)
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Comment delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comment delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
