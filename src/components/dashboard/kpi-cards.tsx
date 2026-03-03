'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Clock,
  Users,
  MessageSquare,
  Star,
  Loader2
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface DashboardStats {
  activeContributors: number;
  commentsThisWeek: number;
  favoritesThisWeek: number;
  pendingValidation: number;
}

interface KPI {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

export function KpiCards() {
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);

  useEffect(() => {
    async function fetchKpis() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data: DashboardStats = await res.json();
          setKpis([
            {
              label: 'En attente',
              value: data.pendingValidation,
              icon: Clock,
              color: '#3b82f6',
            },
            {
              label: 'Contributeurs actifs',
              value: data.activeContributors,
              icon: Users,
              color: '#a855f7',
            },
            {
              label: 'Commentaires (7j)',
              value: data.commentsThisWeek,
              icon: MessageSquare,
              color: '#f97316',
            },
            {
              label: 'Favoris (7j)',
              value: data.favoritesThisWeek,
              icon: Star,
              color: '#eab308',
            },
          ]);
        }
      } catch (error) {
        logger.error('Error fetching KPIs:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchKpis();
  }, []);

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
        <Card key={kpi.label} className="border-border/50 bg-card/80 hover:border-primary/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div
                className="p-1.5 rounded-md"
                style={{ backgroundColor: `${kpi.color}20` }}
              >
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-xl font-bold">
              {typeof kpi.value === 'number' ? kpi.value.toLocaleString('fr-FR') : kpi.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
