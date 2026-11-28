import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VISIBILITY_CONFIG, badgeClasses } from '@/lib/constants';
import type { Visibility } from '@/types';

/**
 * Visibilité de partage d'un REX.
 *
 * Elle n'était montrée que dans le formulaire de l'auteur. Le validateur, qui
 * décide en approuvant d'ouvrir le REX à tous les SDIS, ne la voyait nulle part.
 *
 * `compact` : libellé court pour les cartes de liste ; le libellé complet reste
 * dans l'infobulle et pour les lecteurs d'écran.
 */
export function VisibilityBadge({
  visibility,
  compact = false,
  className,
}: {
  visibility: Visibility | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const config = visibility ? VISIBILITY_CONFIG[visibility] : undefined;
  if (!config) return null;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      title={config.description}
      className={cn('flex items-center gap-1', badgeClasses(config.tone), className)}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {compact ? (
        <>
          <span aria-hidden="true">{config.shortLabel}</span>
          <span className="sr-only">{config.label}</span>
        </>
      ) : (
        config.label
      )}
    </Badge>
  );
}
