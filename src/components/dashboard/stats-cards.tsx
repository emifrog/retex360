'use client';

import { useEffect, useState } from 'react';
import { FileText, Building2, Clock, Sparkles, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Stats {
  totalRex: number;
  sdisCount: number;
  pendingValidation: number;
  validatedThisMonth: number;
}

const statsConfig = [
  {
    key: 'totalRex' as const,
    label: 'RETEX Total',
    icon: FileText,
    color: '#3b82f6',
  },
  {
    key: 'sdisCount' as const,
    label: 'SDIS Participants',
    icon: Building2,
    color: '#22c55e',
  },
  {
    key: 'pendingValidation' as const,
    label: 'En attente validation',
    icon: Clock,
    color: '#f97316',
  },
  {
    key: 'validatedThisMonth' as const,
    label: 'Validés ce mois',
    icon: Sparkles,
    color: '#a855f7',
  },
];

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        logger.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsConfig.map((stat) => (
        <div
          key={stat.key}
          className="relative bg-card border border-border rounded-xl p-5 overflow-hidden"
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background: `linear-gradient(90deg, ${stat.color} 0%, transparent 100%)`,
            }}
          />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  (stats?.[stat.key] ?? 0).toLocaleString('fr-FR')
                )}
              </p>
            </div>
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${stat.color}20` }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
