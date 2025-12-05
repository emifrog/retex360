import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';

const CONTRIBUTORS = [
  { name: 'Cpt. Martin', sdis: 'SDIS 06', count: 23, rank: 1 },
  { name: 'Lt. Dubois', sdis: 'SDIS 83', count: 18, rank: 2 },
  { name: 'Adj. Bernard', sdis: 'SDIS 06', count: 15, rank: 3 },
  { name: 'Sgt. Petit', sdis: 'SDIS 13', count: 12, rank: 4 },
];

const rankColors = {
  1: 'text-yellow-500 border-yellow-500/50',
  2: 'text-gray-400 border-gray-400/50',
  3: 'text-orange-600 border-orange-600/50',
  4: 'text-muted-foreground border-border',
};

export function TopContributors() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Top Contributeurs
        </h2>
      </div>

      <div className="space-y-3">
        {CONTRIBUTORS.map((contributor) => (
          <div
            key={contributor.name}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                rankColors[contributor.rank as keyof typeof rankColors]
              }`}
            >
              {contributor.rank}
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-muted text-xs">
                {contributor.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
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
              <p className="text-[10px] text-muted-foreground">REX</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
