'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Quote, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Temoignage } from '@/types';

interface TemoignagesEditorProps {
  value: Temoignage[];
  onChange: (value: Temoignage[]) => void;
}

export function TemoignagesEditor({ value, onChange }: TemoignagesEditorProps) {
  const [isOpen, setIsOpen] = useState(value.length > 0);

  const addTemoignage = () => {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        auteur_fonction: '',
        citation: '',
        contexte: '',
      },
    ]);
    setIsOpen(true);
  };

  const updateTemoignage = (index: number, field: keyof Temoignage, fieldValue: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: fieldValue };
    onChange(updated);
  };

  const removeTemoignage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Quote className="w-5 h-5 text-primary" />
            <span className="font-medium">Témoignages / Verbatims</span>
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
        {value.map((temoignage, index) => (
          <div
            key={temoignage.id}
            className="border border-border rounded-lg p-4 space-y-3 bg-background/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Témoignage {index + 1}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeTemoignage(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Fonction de l&apos;auteur</Label>
              <Input
                placeholder="Ex : Chef d'agrès, COS, médecin SAMU..."
                value={temoignage.auteur_fonction}
                onChange={(e) => updateTemoignage(index, 'auteur_fonction', e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Citation <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Verbatim du témoignage..."
                value={temoignage.citation}
                onChange={(e) => updateTemoignage(index, 'citation', e.target.value)}
                className="bg-background/50 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Contexte (optionnel)</Label>
              <Input
                placeholder="Ex : Lors de la phase de reconnaissance..."
                value={temoignage.contexte || ''}
                onChange={(e) => updateTemoignage(index, 'contexte', e.target.value)}
                className="bg-background/50"
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={addTemoignage}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un témoignage
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
