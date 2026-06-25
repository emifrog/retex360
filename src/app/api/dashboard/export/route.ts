import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

const CSV_HEADERS = [
  'Titre',
  'Type',
  'Sévérité',
  'Statut',
  'Production',
  'Date intervention',
  'Visibilité',
  'SDIS',
  'Auteur',
  'Créé le',
];
const PAGE_SIZE = 500;
const MAX_ROWS = 10000; // borne anti-exfiltration / DoS

function formatRow(rex: {
  title: string;
  type: string;
  severity: string;
  status: string;
  type_production: string;
  intervention_date: string;
  visibility: string;
  created_at: string;
  sdis: unknown;
  author: unknown;
}): string {
  const sdis = rex.sdis as { code: string; name: string } | null;
  const author = rex.author as { full_name: string } | null;
  return [
    `"${(rex.title || '').replace(/"/g, '""')}"`,
    rex.type,
    rex.severity,
    rex.status,
    rex.type_production,
    rex.intervention_date,
    rex.visibility,
    sdis ? `SDIS ${sdis.code}` : '',
    author?.full_name || '',
    new Date(rex.created_at).toLocaleDateString('fr-FR'),
  ].join(';');
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();

    // Export réservé aux rôles d'encadrement, scopé au SDIS (super_admin transverse).
    const auth = await requireRole(supabase, ['validator', 'admin', 'super_admin']);
    if ('response' in auth) return auth.response;
    const { profile } = auth;
    const isSuperAdmin = profile.role === 'super_admin';

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // BOM + header row
          controller.enqueue(encoder.encode('﻿' + CSV_HEADERS.join(';') + '\n'));

          let offset = 0;
          let hasMore = true;
          let exported = 0;

          while (hasMore && exported < MAX_ROWS) {
            let query = supabase
              .from('rex')
              .select(
                'title, type, severity, status, type_production, intervention_date, visibility, created_at, sdis:sdis_id(code, name), author:profiles!author_id(full_name)'
              )
              .order('created_at', { ascending: false })
              .range(offset, offset + PAGE_SIZE - 1);

            if (!isSuperAdmin) {
              query = query.eq('sdis_id', profile.sdis_id);
            }

            const { data: rexList, error } = await query;

            if (error) {
              logger.error('Export stream error:', error);
              break;
            }

            const rows = rexList || [];
            for (const rex of rows) {
              controller.enqueue(encoder.encode(formatRow(rex) + '\n'));
            }

            exported += rows.length;
            hasMore = rows.length === PAGE_SIZE;
            offset += PAGE_SIZE;
          }

          controller.close();
        } catch (error) {
          logger.error('Export stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="retex360-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    logger.error('Export error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
