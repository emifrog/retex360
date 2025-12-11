import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST - Create new REX
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    // Get user profile for sdis_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('sdis_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ message: 'Profil non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    
    const { data: rex, error } = await supabase
      .from('rex')
      .insert({
        title: body.title,
        intervention_date: body.intervention_date,
        type: body.type,
        severity: body.severity,
        visibility: body.visibility || 'sdis',
        description: body.description,
        context: body.context,
        means_deployed: body.means_deployed,
        difficulties: body.difficulties,
        lessons_learned: body.lessons_learned,
        tags: body.tags || [],
        status: body.status || 'draft',
        author_id: user.id,
        sdis_id: profile.sdis_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating REX:', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    // Link attachments to the new REX
    if (body.attachmentIds && body.attachmentIds.length > 0) {
      const { error: attachError } = await supabase
        .from('rex_attachments')
        .update({ rex_id: rex.id })
        .in('id', body.attachmentIds)
        .eq('uploaded_by', user.id);

      if (attachError) {
        console.error('Error linking attachments:', attachError);
      }
    }

    return NextResponse.json(rex, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// GET - List REX
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');

    let query = supabase
      .from('rex')
      .select('*, author:profiles!author_id(full_name, avatar_url), sdis:sdis_id(code, name)', { count: 'exact' });

    // Filters
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (severity) query = query.eq('severity', severity);
    if (search) query = query.ilike('title', `%${search}%`);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: rexList, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching REX:', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: rexList,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
