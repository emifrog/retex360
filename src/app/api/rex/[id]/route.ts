import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isSdisAdmin, requireUser } from '@/lib/api-auth';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { removeAttachmentObjects, thumbnailPathFor } from '@/lib/storage';
import { sanitizeRexHtmlFields } from '@/lib/sanitize-server';
import { validateRexByType } from '@/lib/validators/rex';

// GET - Get single REX
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Ce handler ne contrôlait pas l'authentification : il s'en remettait à la
    // RLS, qui ne renvoie rien à un anonyme. Le contrôle est désormais
    // explicite — c'est ce qui donne une identité à limiter, et la lecture de
    // REX est la route la plus sollicitée de l'application : la laisser
    // plafonnée par IP revenait à plafonner un SDIS entier.
    const auth = await requireUser(supabase);
    if ('response' in auth) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const limited = await limitByUser(rateLimiters.api, auth.user.id);
    if (limited) return limited;

    const { data: rex, error } = await supabase
      .from('rex')
      .select(
        '*, author:profiles!author_id(full_name, avatar_url, grade), sdis:sdis_id(code, name)'
      )
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
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const limited = await limitByUser(rateLimiters.api, user.id);
    if (limited) return limited;

    // Get existing REX
    const { data: existingRex } = await supabase
      .from('rex')
      .select('author_id, status, sdis_id')
      .eq('id', id)
      .single();

    if (!existingRex) {
      return NextResponse.json({ message: 'REX non trouvé' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, sdis_id')
      .eq('id', user.id)
      .single();

    const isAuthor = existingRex.author_id === user.id;
    const isAdmin = isSdisAdmin(profile, existingRex.sdis_id);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
    }

    // Only allow editing draft REX (unless admin)
    if (!isAdmin && existingRex.status !== 'draft') {
      return NextResponse.json({ message: 'Ce REX ne peut plus être modifié' }, { status: 403 });
    }

    const body = await request.json();

    // Validation Zod (parité avec la création) avant sanitisation/écriture.
    const isDraft = body.status === 'draft';
    const validation = validateRexByType(body, isDraft);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Données invalides', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Sanitize HTML rich-text fields server-side before storage.
    const clean = sanitizeRexHtmlFields(body);

    const { data: rex, error } = await supabase
      .from('rex')
      .update({
        title: clean.title,
        intervention_date: clean.intervention_date,
        type: clean.type,
        severity: clean.severity,
        visibility: clean.visibility,
        description: clean.description,
        context: clean.context,
        means_deployed: clean.means_deployed,
        difficulties: clean.difficulties,
        lessons_learned: clean.lessons_learned,
        tags: clean.tags || [],
        status: clean.status,
        updated_at: new Date().toISOString(),
        // DGSCGC fields
        type_production: clean.type_production,
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
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating REX:', error);
      return NextResponse.json(
        { message: 'Erreur lors de la mise à jour du REX' },
        { status: 500 }
      );
    }

    return NextResponse.json(rex);
  } catch (error) {
    logger.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete REX
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const limited = await limitByUser(rateLimiters.api, user.id);
    if (limited) return limited;

    // Get existing REX
    const { data: existingRex } = await supabase
      .from('rex')
      .select('author_id, sdis_id')
      .eq('id', id)
      .single();

    if (!existingRex) {
      return NextResponse.json({ message: 'REX non trouvé' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, sdis_id')
      .eq('id', user.id)
      .single();

    const isAuthor = existingRex.author_id === user.id;
    const isAdmin = isSdisAdmin(profile, existingRex.sdis_id);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
    }

    // Collect the storage keys BEFORE the delete: `rex_attachments.rex_id` is
    // ON DELETE CASCADE, so the rows disappear with the REX.
    const { data: attachments } = await supabase
      .from('rex_attachments')
      .select('storage_path')
      .eq('rex_id', id);

    // Delete the row FIRST, and only purge storage once the database confirms
    // it. The RLS DELETE policy is narrower than the check above (it also
    // requires the admin to belong to the REX's SDIS), and PostgREST reports a
    // policy-blocked delete as 0 rows WITHOUT an error — purging first would
    // destroy the files of a REX that then survives the delete.
    const { data: deleted, error } = await supabase.from('rex').delete().eq('id', id).select('id');

    if (error) {
      logger.error('Error deleting REX:', error);
      return NextResponse.json(
        { message: 'Erreur lors de la suppression du REX' },
        { status: 500 }
      );
    }

    if (!deleted || deleted.length === 0) {
      logger.warn('REX delete blocked by RLS', { rexId: id, userId: user.id });
      return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
    }

    if (attachments && attachments.length > 0) {
      // Service-role removal (uploaders may differ from the deleter) + clean up
      // thumbnails. Best-effort: the REX is already gone, a leftover object is
      // recoverable waste, whereas deleting too early is irreversible.
      const paths = attachments.flatMap((a) => [a.storage_path, thumbnailPathFor(a.storage_path)]);
      await removeAttachmentObjects(paths);
    }

    return NextResponse.json({ message: 'REX supprimé' });
  } catch (error) {
    logger.error('Error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
