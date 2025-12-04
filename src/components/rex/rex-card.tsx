import Link from 'next/link';
import { Eye, Star, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Rex, Sdis, Profile } from '@/types';

interface RexCardProps {
  rex: Rex & {
    author?: Partial<Profile>;
    sdis?: Partial<Sdis>;
  };
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

const severityConfig = {
  critique: {
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
    label: 'Critique',
  },
  majeur: {
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10',
    label: 'Majeur',
  },
  significatif: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    label: 'Significatif',
  },
};

const statusConfig = {
  draft: {
    label: 'Brouillon',
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  },
  pending: {
    label: 'En attente',
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  },
  validated: {
    label: '✓ Validé',
    className: 'bg-green-500/10 text-green-500 border-green-500/30',
  },
  archived: {
    label: 'Archivé',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  },
};

export function RexCard({ rex, onFavorite, isFavorite = false }: RexCardProps) {
  const severity = severityConfig[rex.severity];
  const status = statusConfig[rex.status];

  return (
    <div className="bg-card/80 border border-border hover:border-primary/40 rounded-xl p-5 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn('w-2.5 h-2.5 rounded-full', severity.color)}
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
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {rex.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-[10px]', status.className)}>
            {status.label}
          </Badge>
          {onFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {rex.tags.length > 4 && (
            <span className="px-2 py-0.5 text-[10px] text-muted-foreground">
              +{rex.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
