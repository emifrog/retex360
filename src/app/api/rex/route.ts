import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { validateRexByType } from '@/lib/validators/rex';
import { sanitizeRexHtmlFields } from '@/lib/sanitize-server';
import { getSubscriptionState } from '@/lib/subscription';

// POST - Create new REX
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    // Get user profile for sdis_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('sdis_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ message: 'Profil non trouvé' }, { status: 404 });
    }

    // Enforcement abonnement (7B) : lecture seule + quota mensuel de REX par plan.
    // Le super_admin n'est pas soumis aux limites de SDIS.
    if (profile.role !== 'super_admin') {
      const sub = await getSubscriptionState(profile.sdis_id);
      if (!sub.canWrite) {
        return NextResponse.json(
          { message: 'Abonnement inactif — création de REX désactivée (lecture seule).' },
          { status: 403 }
        );
      }
      if (sub.maxRexPerMonth !== null) {
        const admin = createAdminClient();
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count } = await admin
          .from('rex')
          .select('*', { count: 'exact', head: true })
          .eq('sdis_id', profile.sdis_id)
          .gte('created_at', monthStart);
        if ((count ?? 0) >= sub.maxRexPerMonth) {
          return NextResponse.json(
            { message: `Limite mensuelle de REX atteinte pour votre abonnement (max ${sub.maxRexPerMonth}/mois).` },
            { status: 403 }
          );
        }
      }
    }

    const body = await request.json();

    // Validate input with Zod
    const isDraft = body.status === 'draft';
    const validation = validateRexByType(body, isDraft);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Données invalides', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    // Sanitize HTML rich-text fields server-side before storage (defense in
    // depth: the Tiptap HTML is client-controlled and could be posted directly).
    const clean = sanitizeRexHtmlFields(body);

    const { data: rex, error } = await supabase
      .from('rex')
      .insert({
        title: clean.title,
        intervention_date: clean.intervention_date,
        type: clean.type,
        severity: clean.severity,
        visibility: clean.visibility || 'sdis',
        description: clean.description,
        context: clean.context,
        means_deployed: clean.means_deployed,
        difficulties: clean.difficulties,
        lessons_learned: clean.lessons_learned,
        tags: clean.tags || [],
        status: clean.status || 'draft',
        author_id: user.id,
        sdis_id: profile.sdis_id,
        // DGSCGC fields
        type_production: clean.type_production || 'retex',
        message_ambiance: clean.message_ambiance || null,
        sitac: clean.sitac || null,
        elements_favorables: clean.elements_favorables || null,
        elements_defavorables: clean.elements_defavorables || null,
        documentation_operationnelle: clean.documentation_operationnelle || null,
        focus_thematiques: clean.focus_thematiques || [],
        key_figures: clean.key_figures || {},
        chronologie: clean.chronologie || [],
        prescriptions: clean.prescriptions || [],
        temoignages: clean.temoignages || [],
        description_site: clean.description_site || null,
        ressources_complementaires: clean.ressources_complementaires || [],
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating REX:', error);
      return NextResponse.json({ message: 'Erreur lors de la création du REX' }, { status: 500 });
    }

    // Link attachments to the new REX
    if (body.attachmentIds && body.attachmentIds.length > 0) {
      const { error: attachError } = await supabase
        .from('rex_attachments')
        .update({ rex_id: rex.id })
        .in('id', body.attachmentIds)
        .eq('uploaded_by', user.id);

      if (attachError) {
        logger.error('Error linking attachments:', attachError);
      }
    }

    return NextResponse.json(rex, { status: 201 });
  } catch (error) {
    logger.error('Error:', error);
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
    const typeProduction = searchParams.get('type_production');
    const search = searchParams.get('search');

    let query = supabase
      .from('rex')
      .select('*, author:profiles!author_id(full_name, avatar_url), sdis:sdis_id(code, name)', { count: 'exact' });

    // Filters
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (severity) query = query.eq('severity', severity);
    if (typeProduction) query = query.eq('type_production', typeProduction);
    if (search) query = query.ilike('title', `%${search}%`);

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: rexList, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logger.error('Error fetching REX:', error);
      return NextResponse.json({ message: 'Erreur lors du chargement des REX' }, { status: 500 });
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
    logger.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
