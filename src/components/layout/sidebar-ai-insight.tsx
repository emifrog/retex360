'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface SidebarAiInsightProps {
  collapsed: boolean;
}

export function SidebarAiInsight({ collapsed }: SidebarAiInsightProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInsight() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) throw new Error();
        const stats = await res.json();

        if (stats.totalRex === 0) {
          setInsight('Créez votre premier RETEX pour activer les insights IA');
        } else if (stats.pendingValidation > 0) {
          setInsight(
            `${stats.pendingValidation} REX en attente de validation — ${stats.totalRex} REX au total sur ${stats.sdisCount} SDIS`
          );
        } else {
          setInsight(
            `${stats.totalRex} REX partagés par ${stats.sdisCount} SDIS — ${stats.activeContributors} contributeurs actifs ce mois`
          );
        }
      } catch (error) {
        logger.error('Sidebar insight error:', error);
        setInsight(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInsight();
  }, []);

  if (!insight && !isLoading) return null;

  if (collapsed) {
    return null;
  }

  return (
    <div className="p-3">
      <div className="p-4 bg-accent border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <p className="text-xs text-primary font-semibold">RETEX360</p>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight}
          </p>
        )}
      </div>
    </div>
  );
}
