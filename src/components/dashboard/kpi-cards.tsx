'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  MessageSquare,
  Star,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPI {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
}

interface KpiCardsProps {
  kpis?: KPI[];
}

const DEFAULT_KPIS: KPI[] = [
  {
    label: 'Temps moyen de validation',
    value: '2.3j',
    change: -15,
    changeLabel: 'vs mois dernier',
    icon: Clock,
    color: '#3b82f6',
  },
  {
    label: 'Taux de validation',
    value: '87%',
    change: 5,
    changeLabel: 'vs mois dernier',
    icon: TrendingUp,
    color: '#22c55e',
  },
  {
    label: 'Contributeurs actifs',
    value: 156,
    change: 12,
    changeLabel: 'ce mois',
    icon: Users,
    color: '#a855f7',
  },
  {
    label: 'Commentaires',
    value: 892,
    change: 23,
    changeLabel: 'cette semaine',
    icon: MessageSquare,
    color: '#f97316',
  },
  {
    label: 'REX favoris',
    value: 234,
    change: 8,
    changeLabel: 'cette semaine',
    icon: Star,
    color: '#eab308',
  },
];

export function KpiCards({ kpis = DEFAULT_KPIS }: KpiCardsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<KPI[]>(kpis);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      setData(kpis);
    }, 500);
    return () => clearTimeout(timer);
  }, [kpis]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {data.map((kpi) => (
        <Card key={kpi.label} className="border-border/50 bg-card/80 hover:border-primary/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div
                className="p-1.5 rounded-md"
                style={{ backgroundColor: `${kpi.color}20` }}
              >
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <div
                className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  kpi.change >= 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {kpi.change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(kpi.change)}%
              </div>
            </div>
            <p className="text-xl font-bold">
              {typeof kpi.value === 'number' ? kpi.value.toLocaleString('fr-FR') : kpi.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
            <p className="text-[9px] text-muted-foreground/70">{kpi.changeLabel}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
