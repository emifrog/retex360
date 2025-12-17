'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowUp, Zap, FileText, ClipboardList, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductionType, FocusThematique } from '@/types';

interface PromotionButtonProps {
  rexId: string;
  currentType: ProductionType;
  rexData: {
    title?: string;
    intervention_date?: string;
    type?: string;
    severity?: string;
    description?: string;
    context?: string;
    means_deployed?: string;
    lessons_learned?: string;
    focus_thematiques?: FocusThematique[];
  };
  disabled?: boolean;
}

const PROMOTION_CONFIG: Record<ProductionType, {
  next: ProductionType | null;
  label: string;
  icon: typeof Zap;
  color: string;
  requiredFields: string[];
  fieldLabels: Record<string, string>;
}> = {
  signalement: {
    next: 'pex',
    label: 'Promouvoir en PEX',
    icon: FileText,
    color: 'bg-blue-500',
    requiredFields: ['context', 'means_deployed', 'lessons_learned'],
    fieldLabels: {
      context: 'Contexte opérationnel',
      means_deployed: 'Moyens engagés',
      lessons_learned: 'Enseignements',
    },
  },
  pex: {
    next: 'retex',
    label: 'Promouvoir en RETEX',
    icon: ClipboardList,
    color: 'bg-amber-500',
    requiredFields: ['context', 'means_deployed', 'lessons_learned', 'focus_thematiques'],
    fieldLabels: {
      context: 'Contexte opérationnel',
      means_deployed: 'Moyens engagés',
      lessons_learned: 'Enseignements',
      focus_thematiques: 'Focus thématiques (min. 1)',
    },
  },
  retex: {
    next: null,
    label: 'Niveau maximum atteint',
    icon: ClipboardList,
    color: 'bg-amber-500',
    requiredFields: [],
    fieldLabels: {},
  },
};

export function PromotionButton({ rexId, currentType, rexData, disabled }: PromotionButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const config = PROMOTION_CONFIG[currentType];
  
  if (!config.next) {
    return null;
  }

  const NextIcon = config.icon;

  const checkFieldCompletion = () => {
    const results: { field: string; label: string; completed: boolean }[] = [];
    
    for (const field of config.requiredFields) {
      let completed = false;
      
      if (field === 'focus_thematiques') {
        completed = (rexData.focus_thematiques?.length || 0) > 0;
      } else {
        const value = rexData[field as keyof typeof rexData];
        completed = typeof value === 'string' && value.trim().length > 0;
      }
      
      results.push({
        field,
        label: config.fieldLabels[field],
        completed,
      });
    }
    
    return results;
  };

  const fieldStatus = checkFieldCompletion();
  const completedCount = fieldStatus.filter(f => f.completed).length;
  const totalCount = fieldStatus.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
  const canPromote = completedCount === totalCount;

  const handlePromote = async () => {
    if (!canPromote) {
      toast.error('Veuillez compléter tous les champs requis');
      return;
    }

    setIsPromoting(true);
    try {
      const response = await fetch(`/api/rex/${rexId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: config.next }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la promotion');
      }

      toast.success(`REX promu en ${config.next?.toUpperCase()} avec succès`);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            'gap-2',
            canPromote && 'border-primary/50 hover:border-primary hover:bg-primary/10'
          )}
        >
          <ArrowUp className="w-4 h-4" />
          {config.label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NextIcon className={cn('w-5 h-5', config.next === 'pex' ? 'text-blue-500' : 'text-amber-500')} />
            {config.label}
          </DialogTitle>
          <DialogDescription>
            Transformez ce {currentType.toUpperCase()} en {config.next?.toUpperCase()} pour enrichir sa documentation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Complétion requise</span>
              <span className={cn(
                'font-medium',
                canPromote ? 'text-green-500' : 'text-orange-500'
              )}>
                {completedCount}/{totalCount} champs
              </span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>

          {/* Field checklist */}
          <div className="space-y-2">
            {fieldStatus.map(({ field, label, completed }) => (
              <div
                key={field}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg border',
                  completed
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-orange-500/5 border-orange-500/20'
                )}
              >
                {completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                )}
                <span className={cn(
                  'text-sm',
                  completed ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                )}>
                  {label}
                </span>
                {completed && (
                  <Badge variant="outline" className="ml-auto text-xs bg-green-500/10 text-green-500 border-green-500/30">
                    Complété
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {!canPromote && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 Modifiez le REX pour compléter les champs manquants avant de pouvoir le promouvoir.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handlePromote}
            disabled={!canPromote || isPromoting}
            className={cn(
              config.next === 'pex'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-amber-600 hover:bg-amber-700'
            )}
          >
            {isPromoting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Promotion...
              </>
            ) : (
              <>
                <ArrowUp className="w-4 h-4 mr-2" />
                Confirmer la promotion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
