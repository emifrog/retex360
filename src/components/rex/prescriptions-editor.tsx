'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardCheck,
  ChevronDown,
  Plus,
  Trash2,
  Target,
  Shield,
  GraduationCap,
  Wrench,
  MoreHorizontal,
  Calendar,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Prescription } from '@/types';
import {
  PRESCRIPTION_CATEGORIES,
  PRESCRIPTION_CATEGORY_CONFIG,
  PRESCRIPTION_STATUSES,
  PRESCRIPTION_STATUS_CONFIG,
} from '@/types';

interface PrescriptionsEditorProps {
  value: Prescription[];
  onChange: (value: Prescription[]) => void;
  className?: string;
}

const iconMap = {
  Target,
  Shield,
  GraduationCap,
  Wrench,
  MoreHorizontal,
};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function PrescriptionsEditor({ value, onChange, className }: PrescriptionsEditorProps) {
  const [isOpen, setIsOpen] = useState(true);

  const addPrescription = () => {
    const newPrescription: Prescription = {
      id: generateId(),
      categorie: 'operations',
      description: '',
      responsable: '',
      echeance: '',
      statut: 'a_faire',
    };
    onChange([...value, newPrescription]);
  };

  const updatePrescription = (id: string, field: keyof Prescription, fieldValue: string) => {
    onChange(
      value.map((p) =>
        p.id === id ? { ...p, [field]: fieldValue } : p
      )
    );
  };

  const removePrescription = (id: string) => {
    onChange(value.filter((p) => p.id !== id));
  };

  const getStatsByStatus = () => {
    const stats: Record<string, number> = { a_faire: 0, en_cours: 0, fait: 0 };
    value.forEach((p) => {
      const status = p.statut || 'a_faire';
      stats[status] = (stats[status] || 0) + 1;
    });
    return stats;
  };

  const statusStats = getStatsByStatus();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Prescriptions</h3>
              <p className="text-sm text-muted-foreground">
                Plan d&apos;actions issu du RETEX
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {value.length > 0 && (
              <div className="flex items-center gap-1">
                {statusStats.fait > 0 && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    {statusStats.fait} fait{statusStats.fait > 1 ? 's' : ''}
                  </Badge>
                )}
                {statusStats.en_cours > 0 && (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                    {statusStats.en_cours} en cours
                  </Badge>
                )}
                {statusStats.a_faire > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {statusStats.a_faire} à faire
                  </Badge>
                )}
              </div>
            )}
            <ChevronDown className={cn(
              'w-5 h-5 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )} />
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-4 pt-4 border-t border-border/50">
          {value.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucune prescription définie</p>
              <p className="text-xs mt-1">Ajoutez des prescriptions pour formaliser le plan d&apos;actions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {value.map((prescription) => {
                const categoryConfig = PRESCRIPTION_CATEGORY_CONFIG[prescription.categorie];
                const Icon = iconMap[categoryConfig.icon as keyof typeof iconMap] || Target;

                return (
                  <div
                    key={prescription.id}
                    className="relative p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        categoryConfig.bgColor
                      )}>
                        <Icon className={cn('w-5 h-5', categoryConfig.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Catégorie */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Catégorie</Label>
                            <Select
                              value={prescription.categorie}
                              onValueChange={(val) => updatePrescription(prescription.id, 'categorie', val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRESCRIPTION_CATEGORIES.map((cat) => {
                                  const catConfig = PRESCRIPTION_CATEGORY_CONFIG[cat];
                                  const CatIcon = iconMap[catConfig.icon as keyof typeof iconMap] || Target;
                                  return (
                                    <SelectItem key={cat} value={cat}>
                                      <div className="flex items-center gap-2">
                                        <CatIcon className={cn('w-4 h-4', catConfig.color)} />
                                        {catConfig.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Statut */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Statut</Label>
                            <Select
                              value={prescription.statut || 'a_faire'}
                              onValueChange={(val) => updatePrescription(prescription.id, 'statut', val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRESCRIPTION_STATUSES.map((status) => {
                                  const sConfig = PRESCRIPTION_STATUS_CONFIG[status];
                                  return (
                                    <SelectItem key={status} value={status}>
                                      <div className="flex items-center gap-2">
                                        <div className={cn(
                                          'w-2 h-2 rounded-full',
                                          status === 'fait' && 'bg-green-500',
                                          status === 'en_cours' && 'bg-amber-500',
                                          status === 'a_faire' && 'bg-gray-400'
                                        )} />
                                        {sConfig.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <Textarea
                            value={prescription.description}
                            onChange={(e) => updatePrescription(prescription.id, 'description', e.target.value)}
                            placeholder="Décrivez la prescription ou l'action à mener..."
                            rows={2}
                            className="resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Responsable */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Responsable (optionnel)
                            </Label>
                            <Input
                              value={prescription.responsable || ''}
                              onChange={(e) => updatePrescription(prescription.id, 'responsable', e.target.value)}
                              placeholder="Ex: Chef de groupe"
                              className="h-9"
                            />
                          </div>

                          {/* Échéance */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Échéance (optionnel)
                            </Label>
                            <Input
                              type="date"
                              value={prescription.echeance || ''}
                              onChange={(e) => updatePrescription(prescription.id, 'echeance', e.target.value)}
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Delete button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => removePrescription(prescription.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addPrescription}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une prescription
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
