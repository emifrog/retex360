'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Contributor {
  rank: number;
  name: string;
  sdis: string;
  count: number;
  avatar_url: string | null;
}

const rankColors: Record<number, string> = {
  1: 'text-yellow-500 border-yellow-500/50',
  2: 'text-gray-400 border-gray-400/50',
  3: 'text-orange-600 border-orange-600/50',
};

export function TopContributors() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContributors() {
      try {
        const res = await fetch('/api/dashboard/contributors');
        if (res.ok) {
          const data = await res.json();
          setContributors(data.contributors || []);
        }
      } catch (error) {
        logger.error('Contributors fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchContributors();
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Top Contributeurs
        </h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : contributors.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun contributeur pour le moment
        </p>
      ) : (
        <div className="space-y-3">
          {contributors.map((contributor) => (
            <div
              key={`${contributor.name}-${contributor.rank}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  rankColors[contributor.rank] || 'text-muted-foreground border-border'
                }`}
              >
                {contributor.rank}
              </div>
              <Avatar className="w-8 h-8">
                <AvatarImage src={contributor.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-xs">
                  {contributor.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{contributor.name}</p>
                <p className="text-xs text-muted-foreground">{contributor.sdis}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary">
                  {contributor.count}
                </p>
                <p className="text-xs text-muted-foreground">REX</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
