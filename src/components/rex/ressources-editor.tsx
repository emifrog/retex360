'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, ChevronDown, Plus, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RESSOURCE_TYPES, type RessourceComplementaire, type RessourceType } from '@/types';

interface RessourcesEditorProps {
  value: RessourceComplementaire[];
  onChange: (value: RessourceComplementaire[]) => void;
}

export function RessourcesEditor({ value, onChange }: RessourcesEditorProps) {
  const [isOpen, setIsOpen] = useState(value.length > 0);

  const addRessource = () => {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        titre: '',
        type: 'autre',
        url_ou_reference: '',
      },
    ]);
    setIsOpen(true);
  };

  const updateRessource = (
    index: number,
    field: keyof RessourceComplementaire,
    fieldValue: string
  ) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: fieldValue };
    onChange(updated);
  };

  const removeRessource = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const getTypeLabel = (type: RessourceType) =>
    RESSOURCE_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-medium">Pour aller plus loin</span>
            {value.length > 0 && <Badge variant="secondary">{value.length}</Badge>}
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-3">
        {value.map((ressource, index) => (
          <div
            key={ressource.id}
            className="border border-border rounded-lg p-4 space-y-3 bg-background/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(ressource.type)}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeRessource(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type de document</Label>
                <Select
                  value={ressource.type}
                  onValueChange={(v) => updateRessource(index, 'type', v)}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESSOURCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Titre <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Ex : GDO Feux de forêt 2023..."
                  value={ressource.titre}
                  onChange={(e) => updateRessource(index, 'titre', e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">URL ou référence</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://... ou référence documentaire"
                  value={ressource.url_ou_reference}
                  onChange={(e) => updateRessource(index, 'url_ou_reference', e.target.value)}
                  className="bg-background/50"
                />
                {ressource.url_ou_reference.startsWith('http') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => window.open(ressource.url_ou_reference, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={addRessource}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une ressource
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
