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
  Clock,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  Bell,
  MapPin,
  Zap,
  Radio,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types';
import { TIMELINE_EVENT_TYPES, TIMELINE_EVENT_CONFIG } from '@/types';

interface TimelineEditorProps {
  value: TimelineEvent[];
  onChange: (value: TimelineEvent[]) => void;
  className?: string;
}

const iconMap = {
  Bell,
  MapPin,
  Zap,
  Radio,
  CheckCircle,
  Circle,
};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function TimelineEditor({ value, onChange, className }: TimelineEditorProps) {
  const [isOpen, setIsOpen] = useState(true);

  const addEvent = () => {
    const newEvent: TimelineEvent = {
      id: generateId(),
      heure: '',
      titre: '',
      description: '',
      type: 'action',
    };
    onChange([...value, newEvent]);
  };

  const updateEvent = (id: string, field: keyof TimelineEvent, fieldValue: string) => {
    onChange(
      value.map((event) =>
        event.id === id ? { ...event, [field]: fieldValue } : event
      )
    );
  };

  const removeEvent = (id: string) => {
    onChange(value.filter((event) => event.id !== id));
  };

  const moveEvent = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= value.length) return;
    
    const newEvents = [...value];
    [newEvents[index], newEvents[newIndex]] = [newEvents[newIndex], newEvents[index]];
    onChange(newEvents);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Chronologie de l&apos;intervention</h3>
              <p className="text-sm text-muted-foreground">
                Événements horodatés de l&apos;intervention
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {value.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {value.length} événement{value.length > 1 ? 's' : ''}
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
        <div className="space-y-4 pt-4 border-t border-border/50">
          {value.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucun événement dans la chronologie</p>
              <p className="text-xs mt-1">Ajoutez des événements pour retracer le déroulement de l&apos;intervention</p>
            </div>
          ) : (
            <div className="space-y-3">
              {value.map((event, index) => {
                const config = TIMELINE_EVENT_CONFIG[event.type];
                const Icon = iconMap[config.icon as keyof typeof iconMap] || Circle;

                return (
                  <div
                    key={event.id}
                    className="relative p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Drag handle & Icon */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="cursor-move text-muted-foreground hover:text-foreground">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          config.bgColor
                        )}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Heure */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Heure</Label>
                            <Input
                              type="time"
                              value={event.heure}
                              onChange={(e) => updateEvent(event.id, 'heure', e.target.value)}
                              className="h-9"
                            />
                          </div>

                          {/* Type */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <Select
                              value={event.type}
                              onValueChange={(val) => updateEvent(event.id, 'type', val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMELINE_EVENT_TYPES.map((type) => {
                                  const typeConfig = TIMELINE_EVENT_CONFIG[type];
                                  const TypeIcon = iconMap[typeConfig.icon as keyof typeof iconMap] || Circle;
                                  return (
                                    <SelectItem key={type} value={type}>
                                      <div className="flex items-center gap-2">
                                        <TypeIcon className={cn('w-4 h-4', typeConfig.color)} />
                                        {typeConfig.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Titre */}
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Titre</Label>
                            <Input
                              value={event.titre}
                              onChange={(e) => updateEvent(event.id, 'titre', e.target.value)}
                              placeholder="Ex: Arrivée premier engin"
                              className="h-9"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Description (optionnel)</Label>
                          <Textarea
                            value={event.description || ''}
                            onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
                            placeholder="Détails complémentaires..."
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveEvent(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronDown className="w-4 h-4 rotate-180" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveEvent(index, 'down')}
                          disabled={index === value.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
            onClick={addEvent}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un événement
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
