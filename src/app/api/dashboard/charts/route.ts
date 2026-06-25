import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const monthNames = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

const typeColors: Record<string, string> = {
  'Incendie urbain': '#ef4444',
  'Incendie industriel': '#f97316',
  FDF: '#eab308',
  SAV: '#3b82f6',
  NRBC: '#a855f7',
  AVP: '#22c55e',
  'Sauvetage déblaiement': '#06b6d4',
  'Secours en montagne': '#8b5cf6',
  'Secours nautique': '#14b8a6',
  Autre: '#6b7280',
};

const severityColors: Record<string, string> = {
  critique: '#ef4444',
  majeur: '#f97316',
  significatif: '#eab308',
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Date range: 12 months ago
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const startDate = twelveMonthsAgo.toISOString();

    // Parallel queries: only fetch what's needed, filtered by date range
    const [createdResult, validatedResult, typeResult, severityResult] = await Promise.all([
      // Timeline: created per month (only last 12 months)
      supabase.from('rex').select('created_at').gte('created_at', startDate),
      // Timeline: validated per month (only last 12 months)
      supabase
        .from('rex')
        .select('validated_at')
        .not('validated_at', 'is', null)
        .gte('validated_at', startDate),
      // Type distribution (all time, lightweight: only type column)
      supabase.from('rex').select('type'),
      // Severity distribution (all time, lightweight: only severity column)
      supabase.from('rex').select('severity'),
    ]);

    if (createdResult.error || typeResult.error || severityResult.error) {
      logger.error(
        'Charts data error:',
        createdResult.error || typeResult.error || severityResult.error
      );
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // --- Timeline: aggregate by month ---
    const createdByMonth = new Map<string, number>();
    const validatedByMonth = new Map<string, number>();

    for (const r of createdResult.data || []) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      createdByMonth.set(key, (createdByMonth.get(key) || 0) + 1);
    }

    for (const r of validatedResult.data || []) {
      const d = new Date(r.validated_at!);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      validatedByMonth.set(key, (validatedByMonth.get(key) || 0) + 1);
    }

    const timeline: { month: string; rex: number; validated: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      timeline.push({
        month: monthNames[d.getMonth()],
        rex: createdByMonth.get(key) || 0,
        validated: validatedByMonth.get(key) || 0,
      });
    }

    // --- REX by type ---
    const typeCounts = new Map<string, number>();
    for (const r of typeResult.data || []) {
      typeCounts.set(r.type, (typeCounts.get(r.type) || 0) + 1);
    }

    const byType = Array.from(typeCounts.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: typeColors[name] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value);

    // --- Severity distribution ---
    const severityCounts = new Map<string, number>();
    for (const r of severityResult.data || []) {
      severityCounts.set(r.severity, (severityCounts.get(r.severity) || 0) + 1);
    }

    const bySeverity = Array.from(severityCounts.entries()).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: severityColors[key] || '#6b7280',
    }));

    return NextResponse.json(
      {
        timeline,
        byType,
        bySeverity,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    logger.error('Charts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
