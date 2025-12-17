'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { THEMES_FOCUS, type FocusThematique } from '@/types';

interface FocusThematiqueEditorProps {
  value: FocusThematique[];
  onChange: (value: FocusThematique[]) => void;
  disabled?: boolean;
  required?: boolean;
}

function generateId() {
  return `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const EMPTY_FOCUS: Omit<FocusThematique, 'id'> = {
  theme: '',
  problematique: '',
  actions_menees: '',
  axes_amelioration: '',
};

export function FocusThematiqueEditor({
  value = [],
  onChange,
  disabled = false,
  required = false,
}: FocusThematiqueEditorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleAdd = () => {
    const newFocus: FocusThematique = {
      id: generateId(),
      ...EMPTY_FOCUS,
    };
    onChange([...value, newFocus]);
    setExpandedIds((prev) => new Set([...prev, newFocus.id]));
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((f) => f.id !== id));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleUpdate = (id: string, field: keyof Omit<FocusThematique, 'id'>, fieldValue: string) => {
    onChange(
      value.map((f) =>
        f.id === id ? { ...f, [field]: fieldValue } : f
      )
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isComplete = (focus: FocusThematique) => {
    return (
      focus.theme &&
      focus.problematique.length >= 10 &&
      focus.actions_menees.length >= 10 &&
      focus.axes_amelioration.length >= 10
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">
            Focus thématiques
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Analysez les différents aspects de l&apos;intervention selon les thèmes du mémento DGSCGC
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un focus
        </Button>
      </div>

      {value.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Aucun focus thématique ajouté
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAdd}
              disabled={disabled}
            >
              Ajouter le premier focus
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {value.map((focus, index) => {
            const isExpanded = expandedIds.has(focus.id);
            const complete = isComplete(focus);

            return (
              <Collapsible
                key={focus.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(focus.id)}
              >
                <Card
                  className={cn(
                    'transition-all duration-200',
                    isExpanded && 'ring-2 ring-primary/20'
                  )}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left w-full"
                          >
                            <span className="text-xs font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                            <span className="font-medium truncate">
                              {focus.theme || 'Nouveau focus'}
                            </span>
                            {complete ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                Complet
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                Incomplet
                              </span>
                            )}
                          </button>
                        </CollapsibleTrigger>
                      </div>

                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={disabled}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce focus ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le focus thématique
                                &quot;{focus.theme || 'Sans titre'}&quot; sera définitivement supprimé.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemove(focus.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-4">
                      {/* Thème */}
                      <div className="space-y-2">
                        <Label htmlFor={`theme-${focus.id}`}>
                          Thème <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={focus.theme}
                          onValueChange={(v) => handleUpdate(focus.id, 'theme', v)}
                          disabled={disabled}
                        >
                          <SelectTrigger id={`theme-${focus.id}`}>
                            <SelectValue placeholder="Sélectionner un thème" />
                          </SelectTrigger>
                          <SelectContent>
                            {THEMES_FOCUS.map((theme) => (
                              <SelectItem key={theme} value={theme}>
                                {theme}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Problématique */}
                      <div className="space-y-2">
                        <Label htmlFor={`problematique-${focus.id}`}>
                          Problématique identifiée <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id={`problematique-${focus.id}`}
                          value={focus.problematique}
                          onChange={(e) => handleUpdate(focus.id, 'problematique', e.target.value)}
                          placeholder="Décrivez la problématique rencontrée..."
                          rows={3}
                          disabled={disabled}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          {focus.problematique.length}/10 caractères minimum
                        </p>
                      </div>

                      {/* Actions menées */}
                      <div className="space-y-2">
                        <Label htmlFor={`actions-${focus.id}`}>
                          Actions menées <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id={`actions-${focus.id}`}
                          value={focus.actions_menees}
                          onChange={(e) => handleUpdate(focus.id, 'actions_menees', e.target.value)}
                          placeholder="Décrivez les actions entreprises..."
                          rows={3}
                          disabled={disabled}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          {focus.actions_menees.length}/10 caractères minimum
                        </p>
                      </div>

                      {/* Axes d'amélioration */}
                      <div className="space-y-2">
                        <Label htmlFor={`axes-${focus.id}`}>
                          Axes d&apos;amélioration <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id={`axes-${focus.id}`}
                          value={focus.axes_amelioration}
                          onChange={(e) => handleUpdate(focus.id, 'axes_amelioration', e.target.value)}
                          placeholder="Proposez des axes d'amélioration..."
                          rows={3}
                          disabled={disabled}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          {focus.axes_amelioration.length}/10 caractères minimum
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {required && value.length === 0 && (
        <p className="text-sm text-destructive">
          Au moins un focus thématique est requis pour un RETEX complet
        </p>
      )}
    </div>
  );
}
