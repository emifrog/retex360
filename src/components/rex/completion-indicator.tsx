'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle2, Circle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductionType, FocusThematique } from '@/types';

interface CompletionIndicatorProps {
  typeProduction: ProductionType;
  data: {
    title?: string;
    intervention_date?: string;
    type?: string;
    severity?: string;
    description?: string;
    context?: string;
    means_deployed?: string;
    difficulties?: string;
    lessons_learned?: string;
    message_ambiance?: string;
    sitac?: string;
    elements_favorables?: string;
    elements_defavorables?: string;
    documentation_operationnelle?: string;
    focus_thematiques?: FocusThematique[];
  };
  variant?: 'compact' | 'detailed';
  className?: string;
}

interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
  recommended: boolean;
}

const FIELD_CONFIG: Record<ProductionType, FieldConfig[]> = {
  signalement: [
    { key: 'title', label: 'Titre', required: true, recommended: false },
    { key: 'intervention_date', label: 'Date', required: true, recommended: false },
    { key: 'type', label: 'Type', required: true, recommended: false },
    { key: 'severity', label: 'Criticité', required: true, recommended: false },
    { key: 'description', label: 'Description', required: true, recommended: false },
  ],
  pex: [
    { key: 'title', label: 'Titre', required: true, recommended: false },
    { key: 'intervention_date', label: 'Date', required: true, recommended: false },
    { key: 'type', label: 'Type', required: true, recommended: false },
    { key: 'severity', label: 'Criticité', required: true, recommended: false },
    { key: 'description', label: 'Description', required: true, recommended: false },
    { key: 'context', label: 'Contexte', required: true, recommended: false },
    { key: 'means_deployed', label: 'Moyens', required: true, recommended: false },
    { key: 'lessons_learned', label: 'Enseignements', required: true, recommended: false },
    { key: 'difficulties', label: 'Difficultés', required: false, recommended: true },
    { key: 'elements_favorables', label: 'Éléments favorables', required: false, recommended: true },
    { key: 'elements_defavorables', label: 'Éléments défavorables', required: false, recommended: true },
  ],
  retex: [
    { key: 'title', label: 'Titre', required: true, recommended: false },
    { key: 'intervention_date', label: 'Date', required: true, recommended: false },
    { key: 'type', label: 'Type', required: true, recommended: false },
    { key: 'severity', label: 'Criticité', required: true, recommended: false },
    { key: 'description', label: 'Description', required: true, recommended: false },
    { key: 'context', label: 'Contexte', required: true, recommended: false },
    { key: 'means_deployed', label: 'Moyens', required: true, recommended: false },
    { key: 'lessons_learned', label: 'Enseignements', required: true, recommended: false },
    { key: 'focus_thematiques', label: 'Focus thématiques', required: true, recommended: false },
    { key: 'message_ambiance', label: 'Message ambiance', required: false, recommended: true },
    { key: 'sitac', label: 'SITAC', required: false, recommended: true },
    { key: 'difficulties', label: 'Difficultés', required: false, recommended: true },
    { key: 'elements_favorables', label: 'Éléments favorables', required: false, recommended: true },
    { key: 'elements_defavorables', label: 'Éléments défavorables', required: false, recommended: true },
    { key: 'documentation_operationnelle', label: 'Documentation', required: false, recommended: true },
  ],
};

function isFieldCompleted(data: CompletionIndicatorProps['data'], key: string): boolean {
  if (key === 'focus_thematiques') {
    return (data.focus_thematiques?.length || 0) > 0;
  }
  const value = data[key as keyof typeof data];
  return typeof value === 'string' && value.trim().length > 0;
}

export function CompletionIndicator({
  typeProduction,
  data,
  variant = 'compact',
  className,
}: CompletionIndicatorProps) {
  const fields = FIELD_CONFIG[typeProduction];
  
  const requiredFields = fields.filter(f => f.required);
  const recommendedFields = fields.filter(f => f.recommended);
  
  const completedRequired = requiredFields.filter(f => isFieldCompleted(data, f.key)).length;
  const completedRecommended = recommendedFields.filter(f => isFieldCompleted(data, f.key)).length;
  
  const requiredPercent = requiredFields.length > 0 
    ? Math.round((completedRequired / requiredFields.length) * 100) 
    : 100;
  
  const totalFields = requiredFields.length + recommendedFields.length;
  const totalCompleted = completedRequired + completedRecommended;
  const totalPercent = totalFields > 0 
    ? Math.round((totalCompleted / totalFields) * 100) 
    : 100;

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2', className)}>
              <Progress value={requiredPercent} className="h-2 w-24" />
              <span className={cn(
                'text-xs font-medium',
                requiredPercent === 100 ? 'text-green-500' : 'text-muted-foreground'
              )}>
                {requiredPercent}%
              </span>
              {requiredPercent === 100 && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-medium">
                Complétion {typeProduction.toUpperCase()}
              </p>
              <p>
                Requis: {completedRequired}/{requiredFields.length} champs
              </p>
              {recommendedFields.length > 0 && (
                <p>
                  Recommandés: {completedRecommended}/{recommendedFields.length} champs
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('space-y-4 p-4 bg-card/50 rounded-lg border border-border/50', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Complétion {typeProduction.toUpperCase()}
          </span>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            requiredPercent === 100 
              ? 'bg-green-500/10 text-green-500 border-green-500/30' 
              : 'bg-orange-500/10 text-orange-500 border-orange-500/30'
          )}
        >
          {totalPercent}% complet
        </Badge>
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Champs requis</span>
            <span className={cn(
              'font-medium',
              requiredPercent === 100 ? 'text-green-500' : 'text-foreground'
            )}>
              {completedRequired}/{requiredFields.length}
            </span>
          </div>
          <Progress value={requiredPercent} className="h-2" />
        </div>

        {recommendedFields.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Champs recommandés</span>
              <span className="font-medium text-foreground">
                {completedRecommended}/{recommendedFields.length}
              </span>
            </div>
            <Progress 
              value={recommendedFields.length > 0 ? (completedRecommended / recommendedFields.length) * 100 : 0} 
              className="h-2 [&>div]:bg-blue-500" 
            />
          </div>
        )}
      </div>

      {/* Field list */}
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field) => {
          const completed = isFieldCompleted(data, field.key);
          return (
            <div
              key={field.key}
              className={cn(
                'flex items-center gap-2 text-xs py-1',
                completed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              )}
            >
              {completed ? (
                <CheckCircle2 className="w-3 h-3 shrink-0" />
              ) : (
                <Circle className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">{field.label}</span>
              {field.required && !completed && (
                <span className="text-destructive">*</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
