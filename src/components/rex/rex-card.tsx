import { memo } from 'react';
import Link from 'next/link';
import { Eye, Star, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SEVERITY_CONFIG, PRODUCTION_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/constants';
import type { Rex, Sdis, Profile } from '@/types';

interface RexCardProps {
  rex: Rex & {
    author?: Partial<Profile>;
    sdis?: Partial<Sdis>;
  };
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

export const RexCard = memo(function RexCard({ rex, onFavorite, isFavorite = false }: RexCardProps) {
  const severity = SEVERITY_CONFIG[rex.severity];
  const status = STATUS_CONFIG[rex.status];
  const productionType = PRODUCTION_TYPE_CONFIG[rex.type_production || 'retex'];
  const ProductionIcon = productionType.icon;

  return (
    <div className="bg-card/80 border border-border hover:border-primary/40 rounded-xl p-5 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn('w-2.5 h-2.5 rounded-full', severity.color)}
            style={{
              boxShadow: `0 0 10px ${severity.hex}40`,
            }}
          />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {rex.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-xs', productionType.className)}>
            <ProductionIcon className="w-3 h-3 mr-1" />
            {productionType.label}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', status.className)}>
            {status.label}
          </Badge>
          {onFavorite && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className={cn(
                'h-8 w-8 transition-opacity',
                isFavorite ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
              )}
              onClick={(e) => {
                e.preventDefault();
                onFavorite(rex.id);
              }}
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                )}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <Link href={`/rex/${rex.id}`}>
        <h3 className="text-base font-semibold text-foreground mb-3 line-clamp-2 hover:text-primary transition-colors">
          {rex.title}
        </h3>
      </Link>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        {rex.sdis && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            SDIS {rex.sdis.code}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(rex.intervention_date).toLocaleDateString('fr-FR')}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {rex.views_count}
        </span>
      </div>

      {/* Tags */}
      {rex.tags && rex.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rex.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {rex.tags.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-muted-foreground">
              +{rex.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
