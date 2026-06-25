'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users, MessageSquare, Star, Loader2 } from 'lucide-react';
import { useDashboardStats } from '@/lib/hooks/use-dashboard-data';

export function KpiCards() {
  const { stats, isLoading } = useDashboardStats();

  const kpis = [
    {
      label: 'En attente',
      value: stats?.pendingValidation ?? 0,
      icon: Clock,
      color: '#3b82f6',
    },
    {
      label: 'Contributeurs actifs',
      value: stats?.activeContributors ?? 0,
      icon: Users,
      color: '#a855f7',
    },
    {
      label: 'Commentaires (7j)',
      value: stats?.commentsThisWeek ?? 0,
      icon: MessageSquare,
      color: '#f97316',
    },
    {
      label: 'Favoris (7j)',
      value: stats?.favoritesThisWeek ?? 0,
      icon: Star,
      color: '#eab308',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/80">
            <CardContent className="p-4 flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className="border-border/50 bg-card/80 hover:border-primary/30 transition-colors"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${kpi.color}20` }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-xl font-bold">
              {typeof kpi.value === 'number' ? kpi.value.toLocaleString('fr-FR') : kpi.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
