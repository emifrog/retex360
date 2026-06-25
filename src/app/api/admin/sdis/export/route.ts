import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { logAdminAction } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Export COMPLET des données d'un SDIS (réversibilité / portabilité, opposable au DSI) :
// infos SDIS + abonnement + domaines + utilisateurs + REX + commentaires + manifest des
// pièces jointes. Admin → son propre SDIS ; super_admin → n'importe quel SDIS (?sdisId=).
// Lecture via le rôle service (traverse la RLS), autorisation contrôlée ici.
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();
    const auth = await requireRole(supabase, ['admin', 'super_admin']);
    if ('response' in auth) return auth.response;
    const { user, profile } = auth;
    const isSuperAdmin = profile.role === 'super_admin';

    // SDIS cible : super_admin peut viser un SDIS ; l'admin est forcé sur le sien.
    const requestedSdisId = request.nextUrl.searchParams.get('sdisId');
    const sdisId = isSuperAdmin ? requestedSdisId || profile.sdis_id : profile.sdis_id;
    if (!sdisId) {
      return NextResponse.json({ error: 'SDIS cible requis' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: sdis } = await admin
      .from('sdis')
      .select('id, code, name, region, departement, logo_url, created_at')
      .eq('id', sdisId)
      .maybeSingle();
    if (!sdis) {
      return NextResponse.json({ error: 'SDIS introuvable' }, { status: 404 });
    }

    const [{ data: subscription }, { data: domains }, { data: users }, { data: rexRaw }] =
      await Promise.all([
        admin
          .from('subscriptions')
          .select(
            'plan, status, suspended_reason, trial_ends_at, current_period_start, current_period_end, max_users, max_rex_per_month, created_at, updated_at'
          )
          .eq('sdis_id', sdisId)
          .maybeSingle(),
        admin.from('allowed_domains').select('domain, created_at').eq('sdis_id', sdisId),
        admin
          .from('profiles')
          .select('id, email, full_name, grade, role, created_at')
          .eq('sdis_id', sdisId)
          .order('created_at', { ascending: true }),
        admin
          .from('rex')
          .select('*')
          .eq('sdis_id', sdisId)
          .order('created_at', { ascending: true }),
      ]);

    // Strip embedding (vecteur volumineux et non pertinent pour un export).
    const rex = (rexRaw || []).map((r) => {
      const row = r as Record<string, unknown>;
      delete row.embedding;
      return row;
    });
    const rexIds = rex.map((r) => r.id as string);

    // Commentaires + manifest des pièces jointes, par lots d'IDs de REX (borne la
    // taille des filtres `in()` sur de gros SDIS).
    async function fetchByRexIds<T>(table: string, columns: string): Promise<T[]> {
      const out: T[] = [];
      for (let i = 0; i < rexIds.length; i += 200) {
        const batch = rexIds.slice(i, i + 200);
        if (batch.length === 0) break;
        const { data } = await admin.from(table).select(columns).in('rex_id', batch);
        if (data) out.push(...(data as T[]));
      }
      return out;
    }

    const comments = rexIds.length
      ? await fetchByRexIds('comments', 'id, rex_id, author_id, content, created_at, updated_at')
      : [];
    const attachments = rexIds.length
      ? await fetchByRexIds(
          'rex_attachments',
          'id, rex_id, uploaded_by, file_name, file_type, file_size, storage_path, created_at'
        )
      : [];

    const exportData = {
      export_date: new Date().toISOString(),
      export_type: 'Export complet SDIS (réversibilité / portabilité)',
      exported_by: { id: user.id, email: user.email, role: profile.role },
      sdis,
      subscription: subscription || null,
      allowed_domains: domains || [],
      users: users || [],
      rex,
      comments,
      // Manifest (métadonnées) des pièces jointes — les binaires restent dans le
      // bucket privé (accès via URLs signées).
      attachments_manifest: attachments,
      counts: {
        users: (users || []).length,
        rex: rex.length,
        comments: comments.length,
        attachments: attachments.length,
      },
    };

    await logAdminAction({
      actorId: user.id,
      actorEmail: user.email ?? null,
      action: 'sdis.export',
      targetType: 'sdis',
      targetId: sdis.id,
      targetLabel: `${sdis.code} — ${sdis.name}`,
      details: exportData.counts,
    });

    const jsonString = JSON.stringify(exportData, null, 2);
    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="retex360-export-sdis-${sdis.code}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error('SDIS export error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
