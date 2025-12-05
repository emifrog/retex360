import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Données de démo
const DEMO_REX = [
  {
    id: '1',
    title: "Feu d'entrepôt chimique - Zone industrielle Carros",
    date: '2024-11-15',
    sdis: 'SDIS 06',
    type: 'Incendie industriel',
    severity: 'critique' as const,
    validated: true,
    views: 234,
    tags: ['NRBC', 'POI', 'multi-sites'],
  },
  {
    id: '2',
    title: 'Effondrement parking souterrain - Nice Centre',
    date: '2024-10-28',
    sdis: 'SDIS 06',
    type: 'Sauvetage déblaiement',
    severity: 'majeur' as const,
    validated: true,
    views: 189,
    tags: ['USAR', 'cynophile', 'extraction'],
  },
  {
    id: '3',
    title: "Feux de forêt simultanés - Massif de l'Estérel",
    date: '2024-08-12',
    sdis: 'SDIS 83',
    type: 'FDF',
    severity: 'critique' as const,
    validated: true,
    views: 456,
    tags: ['colonnes', 'coordination', 'aérien'],
  },
  {
    id: '4',
    title: 'Accident TMD A8 - Produit inconnu',
    date: '2024-09-05',
    sdis: 'SDIS 06',
    type: 'NRBC',
    severity: 'majeur' as const,
    validated: true,
    views: 312,
    tags: ['TMD', 'périmètre', 'décontamination'],
  },
  {
    id: '5',
    title: 'Noyade collective plage Antibes',
    date: '2024-07-22',
    sdis: 'SDIS 06',
    type: 'SAV',
    severity: 'significatif' as const,
    validated: false,
    views: 45,
    tags: ['SAV', 'afflux', 'coordination secours'],
  },
];

const severityColors = {
  critique: 'bg-red-500',
  majeur: 'bg-orange-500',
  significatif: 'bg-yellow-500',
};

export function RecentRex() {
  return (
    <div className="space-y-3">
      {DEMO_REX.map((rex) => (
        <Link
          key={rex.id}
          href={`/rex/${rex.id}`}
          className="block bg-card border border-border hover:border-primary/40 rounded-xl p-4 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  severityColors[rex.severity]
                )}
                style={{
                  boxShadow: `0 0 10px ${
                    rex.severity === 'critique'
                      ? '#ef4444'
                      : rex.severity === 'majeur'
                      ? '#f97316'
                      : '#eab308'
                  }40`,
                }}
              />
              <span className="text-xs text-muted-foreground uppercase">
                {rex.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {rex.validated && (
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px]"
                >
                  ✓ Validé
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {rex.views}
              </span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-2">
            {rex.title}
          </h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{rex.sdis}</span>
            <span>{new Date(rex.date).toLocaleDateString('fr-FR')}</span>
            <div className="flex gap-1.5 ml-auto">
              {rex.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-muted rounded text-[10px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
