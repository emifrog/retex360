import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    // Fetch REX data for export
    const { data: rexList, error } = await supabase
      .from('rex')
      .select('title, type, severity, status, type_production, intervention_date, visibility, created_at, sdis:sdis_id(code, name), author:profiles!author_id(full_name)')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Export error:', error);
      return NextResponse.json({ message: 'Erreur export' }, { status: 500 });
    }

    // Build CSV
    const headers = ['Titre', 'Type', 'Sévérité', 'Statut', 'Production', 'Date intervention', 'Visibilité', 'SDIS', 'Auteur', 'Créé le'];
    const rows = (rexList || []).map((rex) => {
      const sdis = rex.sdis as unknown as { code: string; name: string } | null;
      const author = rex.author as unknown as { full_name: string } | null;
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
    });

    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="retex360-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error('Export error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
