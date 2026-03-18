import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const CSV_HEADERS = ['Titre', 'Type', 'Sévérité', 'Statut', 'Production', 'Date intervention', 'Visibilité', 'SDIS', 'Auteur', 'Créé le'];
const PAGE_SIZE = 500;

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

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // BOM + header row
          controller.enqueue(encoder.encode('\uFEFF' + CSV_HEADERS.join(';') + '\n'));

          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const { data: rexList, error } = await supabase
              .from('rex')
              .select('title, type, severity, status, type_production, intervention_date, visibility, created_at, sdis:sdis_id(code, name), author:profiles!author_id(full_name)')
              .order('created_at', { ascending: false })
              .range(offset, offset + PAGE_SIZE - 1);

            if (error) {
              logger.error('Export stream error:', error);
              break;
            }

            const rows = rexList || [];
            for (const rex of rows) {
              controller.enqueue(encoder.encode(formatRow(rex) + '\n'));
            }

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
