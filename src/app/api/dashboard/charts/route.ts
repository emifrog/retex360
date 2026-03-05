import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch all REX with minimal fields for aggregation
    const { data: allRex, error } = await supabase
      .from('rex')
      .select('type, severity, status, created_at, validated_at');

    if (error) {
      logger.error('Charts data error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const rexList = allRex || [];

    // --- Timeline: REX par mois (12 derniers mois) ---
    const now = new Date();
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const timeline: { month: string; rex: number; validated: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const rexCount = rexList.filter(r => {
        const created = new Date(r.created_at);
        return created >= monthStart && created < monthEnd;
      }).length;

      const validatedCount = rexList.filter(r => {
        if (!r.validated_at) return false;
        const validated = new Date(r.validated_at);
        return validated >= monthStart && validated < monthEnd;
      }).length;

      timeline.push({
        month: monthNames[d.getMonth()],
        rex: rexCount,
        validated: validatedCount,
      });
    }

    // --- REX par type d'intervention ---
    const typeColors: Record<string, string> = {
      'Incendie urbain': '#ef4444',
      'Incendie industriel': '#f97316',
      'FDF': '#eab308',
      'SAV': '#3b82f6',
      'NRBC': '#a855f7',
      'AVP': '#22c55e',
      'Sauvetage déblaiement': '#06b6d4',
      'Secours en montagne': '#8b5cf6',
      'Secours nautique': '#14b8a6',
      'Autre': '#6b7280',
    };

    const typeCounts = new Map<string, number>();
    for (const rex of rexList) {
      typeCounts.set(rex.type, (typeCounts.get(rex.type) || 0) + 1);
    }

    const byType = Array.from(typeCounts.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: typeColors[name] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value);

    // --- Répartition par sévérité ---
    const severityColors: Record<string, string> = {
      critique: '#ef4444',
      majeur: '#f97316',
      significatif: '#eab308',
    };

    const severityCounts = new Map<string, number>();
    for (const rex of rexList) {
      severityCounts.set(rex.severity, (severityCounts.get(rex.severity) || 0) + 1);
    }

    const bySeverity = Array.from(severityCounts.entries())
      .map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
        color: severityColors[key] || '#6b7280',
      }));

    return NextResponse.json({
      timeline,
      byType,
      bySeverity,
    });
  } catch (error) {
    logger.error('Charts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
