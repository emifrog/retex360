'use client';

import { Zap, FileText, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRODUCTION_TYPE_CONFIG, type ProductionType } from '@/types';

interface ProductionTypePickerProps {
  value: ProductionType;
  onChange: (value: ProductionType) => void;
  disabled?: boolean;
}

const ICONS = {
  Zap,
  FileText,
  ClipboardList,
} as const;

export function ProductionTypePicker({
  value,
  onChange,
  disabled = false,
}: ProductionTypePickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Type de production
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.entries(PRODUCTION_TYPE_CONFIG) as [ProductionType, typeof PRODUCTION_TYPE_CONFIG[ProductionType]][]).map(
          ([type, config]) => {
            const Icon = ICONS[config.icon as keyof typeof ICONS];
            const isSelected = value === type;

            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => onChange(type)}
                className={cn(
                  'relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200',
                  'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50',
                  isSelected
                    ? cn(
                        'border-primary bg-primary/5 dark:bg-primary/10',
                        'ring-2 ring-primary/20'
                      )
                    : cn(
                        'border-border bg-card hover:border-muted-foreground/30',
                        'hover:bg-muted/50'
                      ),
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {/* Badge délai */}
                <span
                  className={cn(
                    'absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full',
                    isSelected
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {config.delai}
                </span>

                {/* Icon */}
                <div
                  className={cn(
                    'p-2.5 rounded-lg mb-3',
                    isSelected ? config.bgColor : 'bg-muted'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isSelected ? config.textColor : 'text-muted-foreground'
                    )}
                  />
                </div>

                {/* Content */}
                <div className="text-left">
                  <h3
                    className={cn(
                      'font-semibold text-sm',
                      isSelected ? 'text-foreground' : 'text-foreground/80'
                    )}
                  >
                    {config.shortLabel}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {config.description}
                  </p>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute bottom-2 right-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
              </button>
            );
          }
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        {value === 'signalement' && (
          <>
            <strong>Signalement :</strong> Remontée rapide avec les informations essentielles.
            Idéal pour une première alerte.
          </>
        )}
        {value === 'pex' && (
          <>
            <strong>PEX :</strong> Synthèse factuelle avec contexte, moyens et enseignements.
            Document diffusable (max 4 pages).
          </>
        )}
        {value === 'retex' && (
          <>
            <strong>RETEX :</strong> Analyse complète avec focus thématiques et plan d&apos;actions.
            Conforme au mémento DGSCGC.
          </>
        )}
      </p>
    </div>
  );
}
