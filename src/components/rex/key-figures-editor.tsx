'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Users,
  Clock,
  Heart,
  Truck,
  Building2,
  Droplets,
  Move,
  PersonStanding,
  Flame,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeyFigures, BilanHumain } from '@/types';

interface KeyFiguresEditorProps {
  value: KeyFigures;
  onChange: (value: KeyFigures) => void;
  className?: string;
}

export function KeyFiguresEditor({ value, onChange, className }: KeyFiguresEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [newSdis, setNewSdis] = useState('');

  const updateField = <K extends keyof KeyFigures>(field: K, fieldValue: KeyFigures[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const updateBilan = <K extends keyof BilanHumain>(field: K, fieldValue: BilanHumain[K]) => {
    onChange({
      ...value,
      bilan_humain: {
        ...value.bilan_humain,
        [field]: fieldValue,
      },
    });
  };

  const addSdis = () => {
    if (newSdis.trim()) {
      const current = value.sdis_impliques || [];
      if (!current.includes(newSdis.trim().toUpperCase())) {
        updateField('sdis_impliques', [...current, newSdis.trim().toUpperCase()]);
      }
      setNewSdis('');
    }
  };

  const removeSdis = (sdis: string) => {
    const current = value.sdis_impliques || [];
    updateField('sdis_impliques', current.filter(s => s !== sdis));
  };

  const hasData = value && (
    value.nb_sp_engages ||
    value.duree_intervention ||
    value.nb_vehicules ||
    value.bilan_humain?.victimes_decedees ||
    value.bilan_humain?.victimes_urgence_absolue ||
    value.bilan_humain?.victimes_urgence_relative ||
    value.bilan_humain?.impliques ||
    value.sdis_impliques?.length ||
    value.surface_sinistree ||
    value.nb_personnes_evacuees ||
    value.nb_lances ||
    value.debit_eau
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Chiffres clés de l&apos;intervention</h3>
              <p className="text-sm text-muted-foreground">
                Effectifs, durée, bilan, moyens engagés
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasData && (
              <Badge variant="secondary" className="text-xs">
                Renseigné
              </Badge>
            )}
            <ChevronDown className={cn(
              'w-5 h-5 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )} />
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-6 pt-4 border-t border-border/50">
          {/* Chiffres principaux */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* SP engagés */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                Nombre de SP engagés
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="Ex: 45"
                value={value.nb_sp_engages || ''}
                onChange={(e) => updateField('nb_sp_engages', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            {/* Durée */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                Durée d&apos;intervention
              </Label>
              <Input
                type="text"
                placeholder="Ex: 4h30 ou 04:30"
                value={value.duree_intervention || ''}
                onChange={(e) => updateField('duree_intervention', e.target.value || undefined)}
              />
            </div>

            {/* Véhicules */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-green-600" />
                Nombre de véhicules
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="Ex: 12"
                value={value.nb_vehicules || ''}
                onChange={(e) => updateField('nb_vehicules', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Bilan humain */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Heart className="w-4 h-4 text-red-600" />
              Bilan humain
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Décédés (DCD)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={value.bilan_humain?.victimes_decedees || ''}
                  onChange={(e) => updateBilan('victimes_decedees', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Urgence Absolue (UA)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={value.bilan_humain?.victimes_urgence_absolue || ''}
                  onChange={(e) => updateBilan('victimes_urgence_absolue', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Urgence Relative (UR)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={value.bilan_humain?.victimes_urgence_relative || ''}
                  onChange={(e) => updateBilan('victimes_urgence_relative', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Impliqués</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={value.bilan_humain?.impliques || ''}
                  onChange={(e) => updateBilan('impliques', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* SDIS impliqués */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="w-4 h-4 text-purple-600" />
              SDIS impliqués
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Code SDIS (ex: 74, 73, 01)"
                value={newSdis}
                onChange={(e) => setNewSdis(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSdis())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addSdis}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {value.sdis_impliques && value.sdis_impliques.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {value.sdis_impliques.map((sdis) => (
                  <Badge key={sdis} variant="secondary" className="gap-1 pr-1">
                    SDIS {sdis}
                    <button
                      type="button"
                      onClick={() => removeSdis(sdis)}
                      className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Chiffres secondaires */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground">
              Informations complémentaires
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Move className="w-3 h-3" />
                  Surface sinistrée
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: 500 m²"
                  value={value.surface_sinistree || ''}
                  onChange={(e) => updateField('surface_sinistree', e.target.value || undefined)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PersonStanding className="w-3 h-3" />
                  Personnes évacuées
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={value.nb_personnes_evacuees || ''}
                  onChange={(e) => updateField('nb_personnes_evacuees', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="w-3 h-3" />
                  Lances en action
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={value.nb_lances || ''}
                  onChange={(e) => updateField('nb_lances', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Droplets className="w-3 h-3" />
                  Débit d&apos;eau
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: 2000 L/min"
                  value={value.debit_eau || ''}
                  onChange={(e) => updateField('debit_eau', e.target.value || undefined)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
