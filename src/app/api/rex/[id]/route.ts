import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// GET - Get single REX
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: rex, error } = await supabase
      .from('rex')
      .select('*, author:profiles!author_id(full_name, avatar_url, grade), sdis:sdis_id(code, name)')
      .eq('id', id)
      .single();

    if (error || !rex) {
      return NextResponse.json({ message: 'REX non trouvé' }, { status: 404 });
    }

    return NextResponse.json(rex);
  } catch (error) {
    logger.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Update REX
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    // Get existing REX
    const { data: existingRex } = await supabase
      .from('rex')
      .select('author_id, status')
      .eq('id', id)
      .single();

    if (!existingRex) {
      return NextResponse.json({ message: 'REX non trouvé' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthor = existingRex.author_id === user.id;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
    }

    // Only allow editing draft REX (unless admin)
    if (!isAdmin && existingRex.status !== 'draft') {
      return NextResponse.json({ message: 'Ce REX ne peut plus être modifié' }, { status: 403 });
    }

    const body = await request.json();

    const { data: rex, error } = await supabase
      .from('rex')
      .update({
        title: body.title,
        intervention_date: body.intervention_date,
        type: body.type,
        severity: body.severity,
        visibility: body.visibility,
        description: body.description,
        context: body.context,
        means_deployed: body.means_deployed,
        difficulties: body.difficulties,
        lessons_learned: body.lessons_learned,
        tags: body.tags || [],
        status: body.status,
        updated_at: new Date().toISOString(),
        // DGSCGC fields
        type_production: body.type_production,
        message_ambiance: body.message_ambiance || null,
        sitac: body.sitac || null,
        elements_favorables: body.elements_favorables || null,
        elements_defavorables: body.elements_defavorables || null,
        documentation_operationnelle: body.documentation_operationnelle || null,
        focus_thematiques: body.focus_thematiques || [],
        key_figures: body.key_figures || {},
        chronologie: body.chronologie || [],
        prescriptions: body.prescriptions || [],
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating REX:', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(rex);
  } catch (error) {
    logger.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete REX
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    // Get existing REX
    const { data: existingRex } = await supabase
      .from('rex')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!existingRex) {
      return NextResponse.json({ message: 'REX non trouvé' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAuthor = existingRex.author_id === user.id;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
    }

    // Clean up attachment files from storage before deleting the REX
    const { data: attachments } = await supabase
      .from('rex_attachments')
      .select('storage_path')
      .eq('rex_id', id);

    if (attachments && attachments.length > 0) {
      const paths = attachments.map((a) => a.storage_path);
      await supabase.storage.from('rex-attachments').remove(paths);
    }

    const { error } = await supabase
      .from('rex')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting REX:', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'REX supprimé' });
  } catch (error) {
    logger.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
