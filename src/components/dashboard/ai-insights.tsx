'use client';

import { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface Insight {
  type: 'pattern' | 'suggestion' | 'alert';
  text: string;
  priority: 'high' | 'medium' | 'low';
}

const insightConfig = {
  pattern: {
    icon: TrendingUp,
    label: 'Pattern',
    color: '#a855f7',
  },
  suggestion: {
    icon: Lightbulb,
    label: 'Suggestion',
    color: '#3b82f6',
  },
  alert: {
    icon: AlertTriangle,
    label: 'Alerte',
    color: '#ef4444',
  },
};

export function AiInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/dashboard/insights');
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        } else {
          setError(true);
        }
      } catch (err) {
        logger.error('Insights fetch error:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInsights();
  }, []);

  return (
    <div className="bg-card border border-purple-500/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Analyses IA
        </h2>
        <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-500 border-purple-500/30">
          OpenRouter
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
        </div>
      ) : error || insights.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {error ? 'Erreur lors du chargement des analyses' : 'Aucune analyse disponible'}
        </p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const config = insightConfig[insight.type] || insightConfig.suggestion;
            const Icon = config.icon;

            return (
              <div
                key={i}
                className={cn(
                  'p-3 rounded-lg border',
                  insight.priority === 'high'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-purple-500/10 border-purple-500/20'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    className="w-4 h-4"
                    style={{ color: config.color }}
                  />
                  <span
                    className="text-xs uppercase font-semibold"
                    style={{ color: config.color }}
                  >
                    {config.label}
                  </span>
                  {insight.priority === 'high' && (
                    <Badge
                      variant="outline"
                      className="bg-red-500/20 text-red-500 border-red-500/30 text-[9px] px-1.5 py-0"
                    >
                      PRIORITAIRE
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {insight.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
