'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  Target,
  Shield,
  GraduationCap,
  Wrench,
  MoreHorizontal,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Prescription } from '@/types';
import { PRESCRIPTION_CATEGORY_CONFIG, PRESCRIPTION_STATUS_CONFIG } from '@/types';

interface PrescriptionsListProps {
  prescriptions: Prescription[];
  className?: string;
}

const iconMap = {
  Target,
  Shield,
  GraduationCap,
  Wrench,
  MoreHorizontal,
};

const statusIconMap = {
  a_faire: Circle,
  en_cours: Clock,
  fait: CheckCircle2,
};

export function PrescriptionsList({ prescriptions, className }: PrescriptionsListProps) {
  if (!prescriptions || prescriptions.length === 0) return null;

  const groupedByCategory = prescriptions.reduce((acc, p) => {
    if (!acc[p.categorie]) {
      acc[p.categorie] = [];
    }
    acc[p.categorie].push(p);
    return acc;
  }, {} as Record<string, Prescription[]>);

  const getStats = () => {
    const total = prescriptions.length;
    const fait = prescriptions.filter(p => p.statut === 'fait').length;
    const enCours = prescriptions.filter(p => p.statut === 'en_cours').length;
    const aFaire = total - fait - enCours;
    return { total, fait, enCours, aFaire };
  };

  const stats = getStats();

  return (
    <Card className={cn('p-4 bg-card/80 border-border/50', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          Prescriptions ({stats.total})
        </h3>
        <div className="flex items-center gap-2">
          {stats.fait > 0 && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {stats.fait} fait{stats.fait > 1 ? 's' : ''}
            </Badge>
          )}
          {stats.enCours > 0 && (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {stats.enCours} en cours
            </Badge>
          )}
          {stats.aFaire > 0 && (
            <Badge variant="secondary" className="text-xs">
              {stats.aFaire} à faire
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedByCategory).map(([category, items]) => {
          const categoryConfig = PRESCRIPTION_CATEGORY_CONFIG[category as keyof typeof PRESCRIPTION_CATEGORY_CONFIG];
          const CategoryIcon = iconMap[categoryConfig.icon as keyof typeof iconMap] || Target;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'w-6 h-6 rounded flex items-center justify-center',
                  categoryConfig.bgColor
                )}>
                  <CategoryIcon className={cn('w-3.5 h-3.5', categoryConfig.color)} />
                </div>
                <span className="text-sm font-medium">{categoryConfig.label}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {items.length}
                </Badge>
              </div>

              <div className="space-y-2 ml-8">
                {items.map((prescription) => {
                  const statusConfig = PRESCRIPTION_STATUS_CONFIG[prescription.statut || 'a_faire'];
                  const StatusIcon = statusIconMap[prescription.statut || 'a_faire'];

                  return (
                    <div
                      key={prescription.id}
                      className="p-3 rounded-lg border border-border/50 bg-background/50"
                    >
                      <div className="flex items-start gap-2">
                        <StatusIcon className={cn(
                          'w-4 h-4 mt-0.5 shrink-0',
                          prescription.statut === 'fait' && 'text-green-500',
                          prescription.statut === 'en_cours' && 'text-amber-500',
                          (!prescription.statut || prescription.statut === 'a_faire') && 'text-gray-400'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm',
                            prescription.statut === 'fait' && 'line-through text-muted-foreground'
                          )}>
                            {prescription.description}
                          </p>
                          {(prescription.responsable || prescription.echeance) && (
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              {prescription.responsable && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {prescription.responsable}
                                </span>
                              )}
                              {prescription.echeance && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(prescription.echeance).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn('text-xs shrink-0', statusConfig.bgColor, statusConfig.color)}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
