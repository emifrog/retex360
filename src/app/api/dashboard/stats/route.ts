import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const limited = await limitByUser(rateLimiters.api, user.id);
    if (limited) return limited;

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const yearAgo = new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      totalRexResult,
      sdisResult,
      activeSdisResult,
      pendingResult,
      validatedThisMonthResult,
      validatedLastYearResult,
      contributorsResult,
      commentsThisWeekResult,
      favoritesThisWeekResult,
    ] = await Promise.all([
      // Total REX count
      supabase.from('rex').select('*', { count: 'exact', head: true }),
      // Taille de la table de référence (tous les SDIS de France). Conservé pour
      // les consommateurs existants, mais ce n'est PAS un indicateur d'activité :
      // affiché en « SDIS participants », il annonçait 97 services là où un seul
      // avait publié quoi que ce soit.
      supabase.from('sdis').select('*', { count: 'exact', head: true }),
      // SDIS ayant réellement publié : distincts parmi les REX visibles par
      // l'appelant (la RLS cloisonne, le chiffre est donc celui de SON horizon).
      supabase.from('rex').select('sdis_id'),
      // Pending validation count
      supabase.from('rex').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      // Validated this month
      supabase
        .from('rex')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'validated')
        .gte('validated_at', monthStart),
      // Validés sur 12 mois glissants — la période du graphique d'évolution.
      // « Validés ce mois » affichait 0 dès qu'aucune validation n'avait eu lieu
      // dans le mois : un compteur à zéro en tête de page n'informe pas.
      supabase
        .from('rex')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'validated')
        .gte('validated_at', yearAgo),
      // Active contributors (distinct authors this month)
      supabase.from('rex').select('author_id').gte('created_at', monthStart),
      // Comments this week
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      // Favorites this week
      supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
    ]);

    const uniqueContributors = new Set(contributorsResult.data?.map((r) => r.author_id) || []).size;
    const activeSdis = new Set(activeSdisResult.data?.map((r) => r.sdis_id) || []).size;

    return NextResponse.json(
      {
        totalRex: totalRexResult.count || 0,
        sdisCount: sdisResult.count || 0,
        activeSdis,
        pendingValidation: pendingResult.count || 0,
        validatedThisMonth: validatedThisMonthResult.count || 0,
        validatedLastYear: validatedLastYearResult.count || 0,
        activeContributors: uniqueContributors,
        commentsThisWeek: commentsThisWeekResult.count || 0,
        favoritesThisWeek: favoritesThisWeekResult.count || 0,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
