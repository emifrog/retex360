import { Sparkles, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AI_INSIGHTS = [
  {
    type: 'pattern' as const,
    text: 'Défaut de liaison radio récurrent lors des opérations multi-sites (12 occurrences en 6 mois)',
    priority: 'high' as const,
  },
  {
    type: 'suggestion' as const,
    text: "Procédure de reconnaissance initiale FDF : 3 SDIS suggèrent l'utilisation systématique de drones thermiques",
    priority: 'medium' as const,
  },
  {
    type: 'alert' as const,
    text: 'Augmentation 40% des interventions TMD sur A8 - Révision PPI recommandée',
    priority: 'high' as const,
  },
];

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
  return (
    <div className="bg-card border border-purple-500/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Analyses IA
        </h2>
      </div>

      <div className="space-y-3">
        {AI_INSIGHTS.map((insight, i) => {
          const config = insightConfig[insight.type];
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
                  className="text-[10px] uppercase font-semibold"
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

      <Button
        variant="outline"
        className="w-full mt-4 bg-purple-500/10 border-purple-500/30 text-purple-500 hover:bg-purple-500/20"
      >
        Voir toutes les analyses →
      </Button>
    </div>
  );
}
