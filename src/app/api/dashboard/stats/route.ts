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

    // Run all queries in parallel
    const [
      totalRexResult,
      sdisResult,
      pendingResult,
      validatedThisMonthResult,
      contributorsResult,
      commentsThisWeekResult,
      favoritesThisWeekResult,
    ] = await Promise.all([
      // Total REX count
      supabase.from('rex').select('*', { count: 'exact', head: true }),
      // SDIS count
      supabase.from('sdis').select('*', { count: 'exact', head: true }),
      // Pending validation count
      supabase.from('rex').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      // Validated this month
      supabase.from('rex').select('*', { count: 'exact', head: true })
        .eq('status', 'validated')
        .gte('validated_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      // Active contributors (distinct authors this month)
      supabase.from('rex').select('author_id')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      // Comments this week
      supabase.from('comments').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      // Favorites this week
      supabase.from('favorites').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Count unique contributors
    const uniqueContributors = new Set(contributorsResult.data?.map(r => r.author_id) || []).size;

    return NextResponse.json({
      totalRex: totalRexResult.count || 0,
      sdisCount: sdisResult.count || 0,
      pendingValidation: pendingResult.count || 0,
      validatedThisMonth: validatedThisMonthResult.count || 0,
      activeContributors: uniqueContributors,
      commentsThisWeek: commentsThisWeekResult.count || 0,
      favoritesThisWeek: favoritesThisWeekResult.count || 0,
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
