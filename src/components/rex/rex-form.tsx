'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { REX_TYPES, SEVERITIES, VISIBILITIES, type ProductionType, type FocusThematique, type KeyFigures, type TimelineEvent, type Prescription } from '@/types';
import { TiptapEditor } from './tiptap-editor';
import { ImageUpload } from './image-upload';
import { ProductionTypePicker } from './production-type-picker';
import { FocusThematiqueEditor } from './focus-thematique-editor';
import { KeyFiguresEditor } from './key-figures-editor';
import { TimelineEditor } from './timeline-editor';
import { PrescriptionsEditor } from './prescriptions-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, Send, X, Plus, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RexFormData {
  title: string;
  intervention_date: string;
  type: string;
  severity: string;
  visibility: string;
  type_production: ProductionType;
  description: string;
  context: string;
  means_deployed: string;
  difficulties: string;
  lessons_learned: string;
  message_ambiance: string;
  sitac: string;
  elements_favorables: string;
  elements_defavorables: string;
  documentation_operationnelle: string;
  focus_thematiques: FocusThematique[];
  key_figures: KeyFigures;
  chronologie: TimelineEvent[];
  prescriptions: Prescription[];
  tags: string[];
}

interface RexFormProps {
  initialData?: Partial<RexFormData>;
  rexId?: string;
  mode?: 'create' | 'edit';
}

const severityLabels = {
  critique: { label: 'Critique', color: 'bg-red-500/20 text-red-500 border-red-500/30' },
  majeur: { label: 'Majeur', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
  significatif: { label: 'Significatif', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
};

const visibilityLabels = {
  sdis: 'Mon SDIS uniquement',
  inter_sdis: 'Tous les SDIS',
  public: 'Public',
};

export function RexForm({ initialData, rexId, mode = 'create' }: RexFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['context', 'analysis'])
  );
  const [uploadedFiles, setUploadedFiles] = useState<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    url: string;
  }[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RexFormData>({
    defaultValues: {
      title: initialData?.title || '',
      intervention_date: initialData?.intervention_date || '',
      type: initialData?.type || '',
      severity: initialData?.severity || '',
      visibility: initialData?.visibility || 'sdis',
      type_production: initialData?.type_production || 'retex',
      description: initialData?.description || '',
      context: initialData?.context || '',
      means_deployed: initialData?.means_deployed || '',
      difficulties: initialData?.difficulties || '',
      lessons_learned: initialData?.lessons_learned || '',
      message_ambiance: initialData?.message_ambiance || '',
      sitac: initialData?.sitac || '',
      elements_favorables: initialData?.elements_favorables || '',
      elements_defavorables: initialData?.elements_defavorables || '',
      documentation_operationnelle: initialData?.documentation_operationnelle || '',
      focus_thematiques: initialData?.focus_thematiques || [],
      key_figures: initialData?.key_figures || {},
      chronologie: initialData?.chronologie || [],
      prescriptions: initialData?.prescriptions || [],
      tags: initialData?.tags || [],
    },
  });

  const typeProduction = watch('type_production');
  const tags = watch('tags') || [];
  const focusThematiques = watch('focus_thematiques') || [];
  const keyFigures = watch('key_figures') || {};
  const chronologie = watch('chronologie') || [];
  const prescriptions = watch('prescriptions') || [];

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue('tags', [...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter((tag) => tag !== tagToRemove));
  };

  const isFieldRequired = (field: string): boolean => {
    const requiredByType: Record<ProductionType, string[]> = {
      signalement: ['title', 'intervention_date', 'type', 'severity', 'description'],
      pex: ['title', 'intervention_date', 'type', 'severity', 'description', 'context', 'means_deployed', 'lessons_learned'],
      retex: ['title', 'intervention_date', 'type', 'severity', 'description', 'context', 'means_deployed', 'lessons_learned', 'focus_thematiques'],
    };
    return requiredByType[typeProduction]?.includes(field) || false;
  };

  const onSubmit = async (data: RexFormData, status: 'draft' | 'pending') => {
    setIsSubmitting(true);
    try {
      const endpoint = mode === 'edit' ? `/api/rex/${rexId}` : '/api/rex';
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...data, 
          status,
          attachmentIds: uploadedFiles.map(f => f.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la sauvegarde');
      }

      await response.json();
      
      toast.success(
        mode === 'edit'
          ? 'REX mis à jour'
          : status === 'draft'
            ? 'Brouillon enregistré'
            : 'REX soumis pour validation'
      );
      router.push(mode === 'edit' ? `/rex/${rexId}` : '/rex');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6">
      {/* Production Type Picker */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-6">
          <ProductionTypePicker
            value={typeProduction}
            onChange={(value) => setValue('type_production', value)}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Informations générales</CardTitle>
          <CardDescription>
            Informations de base sur l&apos;intervention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Intitulé de l&apos;intervention {isFieldRequired('title') && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Ex: Feu d'habitation R+3 - Centre-ville Nice"
              className="bg-background/50"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="intervention_date">
                Date d&apos;intervention {isFieldRequired('intervention_date') && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="intervention_date"
                type="date"
                {...register('intervention_date')}
                className="bg-background/50"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>
                Type d&apos;intervention {isFieldRequired('type') && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value)}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {REX_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label>
                Niveau de criticité {isFieldRequired('severity') && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={watch('severity')}
                onValueChange={(value) => setValue('severity', value)}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((sev) => (
                    <SelectItem key={sev} value={sev}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            sev === 'critique' && 'bg-red-500',
                            sev === 'majeur' && 'bg-orange-500',
                            sev === 'significatif' && 'bg-yellow-500'
                          )}
                        />
                        {severityLabels[sev].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibilité</Label>
            <Select
              value={watch('visibility')}
              onValueChange={(value) => setValue('visibility', value)}
            >
              <SelectTrigger className="bg-background/50 w-full md:w-1/3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITIES.map((vis) => (
                  <SelectItem key={vis} value={vis}>
                    {visibilityLabels[vis]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Ajouter un tag..."
                className="bg-background/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-2 py-1 cursor-pointer hover:bg-destructive/20"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chiffres clés */}
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <KeyFiguresEditor
          value={keyFigures}
          onChange={(value) => setValue('key_figures', value)}
        />
      </Card>

      {/* Synthèse */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Synthèse</CardTitle>
          <CardDescription>
            Description générale de l&apos;intervention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              Description {isFieldRequired('description') && <span className="text-destructive">*</span>}
            </Label>
            <TiptapEditor
              content={watch('description') || ''}
              onChange={(content) => setValue('description', content)}
              placeholder="Décrivez brièvement l'intervention et ses enjeux principaux..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Section Contexte - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Collapsible
          open={expandedSections.has('context')}
          onOpenChange={() => toggleSection('context')}
        >
          <Card className="border-border/50 bg-card/80">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Contexte opérationnel</CardTitle>
                    <CardDescription>
                      Message d&apos;ambiance, situation tactique, moyens engagés
                    </CardDescription>
                  </div>
                  {expandedSections.has('context') ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-0">
                {/* Message d'ambiance - Recommandé pour RETEX */}
                {typeProduction === 'retex' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Message d&apos;ambiance
                      <Badge variant="outline" className="text-xs font-normal">Recommandé</Badge>
                    </Label>
                    <TiptapEditor
                      content={watch('message_ambiance') || ''}
                      onChange={(content) => setValue('message_ambiance', content)}
                      placeholder="Perception du premier COS à son arrivée, 'bande sons' ou expression de sa perception SLLX..."
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Selon l&apos;Annexe F du mémento DGSCGC
                    </p>
                  </div>
                )}

                {/* SITAC - Recommandé pour RETEX */}
                {typeProduction === 'retex' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      SITAC (Situation Tactique)
                      <Badge variant="outline" className="text-xs font-normal">Recommandé</Badge>
                    </Label>
                    <TiptapEditor
                      content={watch('sitac') || ''}
                      onChange={(content) => setValue('sitac', content)}
                      placeholder="Description de la situation tactique, cartographie, représentation schématique du bâtiment..."
                    />
                  </div>
                )}

                <Separator />

                {/* Contexte */}
                <div className="space-y-2">
                  <Label>
                    Contexte opérationnel {isFieldRequired('context') && <span className="text-destructive">*</span>}
                  </Label>
                  <TiptapEditor
                    content={watch('context') || ''}
                    onChange={(content) => setValue('context', content)}
                    placeholder="Décrivez le contexte de l'intervention (lieu, conditions, situation initiale)..."
                  />
                </div>

                {/* Moyens engagés */}
                <div className="space-y-2">
                  <Label>
                    Moyens engagés {isFieldRequired('means_deployed') && <span className="text-destructive">*</span>}
                  </Label>
                  <TiptapEditor
                    content={watch('means_deployed') || ''}
                    onChange={(content) => setValue('means_deployed', content)}
                    placeholder="Listez les moyens humains et matériels engagés..."
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Section Analyse - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Collapsible
          open={expandedSections.has('analysis')}
          onOpenChange={() => toggleSection('analysis')}
        >
          <Card className="border-border/50 bg-card/80">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Analyse</CardTitle>
                    <CardDescription>
                      Éléments favorables/défavorables, difficultés, enseignements
                    </CardDescription>
                  </div>
                  {expandedSections.has('analysis') ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-0">
                {/* Éléments favorables */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Éléments favorables
                    <Badge variant="outline" className="text-xs font-normal bg-green-500/10 text-green-600 border-green-500/30">
                      Facilitateurs
                    </Badge>
                  </Label>
                  <TiptapEditor
                    content={watch('elements_favorables') || ''}
                    onChange={(content) => setValue('elements_favorables', content)}
                    placeholder="Éléments facilitateurs pour la gestion de l'intervention..."
                  />
                </div>

                {/* Éléments défavorables */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Éléments défavorables
                    <Badge variant="outline" className="text-xs font-normal bg-red-500/10 text-red-600 border-red-500/30">
                      Perturbateurs
                    </Badge>
                  </Label>
                  <TiptapEditor
                    content={watch('elements_defavorables') || ''}
                    onChange={(content) => setValue('elements_defavorables', content)}
                    placeholder="Éléments perturbateurs et déstabilisants pour la gestion de l'intervention..."
                  />
                </div>

                <Separator />

                {/* Difficultés */}
                <div className="space-y-2">
                  <Label>Difficultés rencontrées</Label>
                  <TiptapEditor
                    content={watch('difficulties') || ''}
                    onChange={(content) => setValue('difficulties', content)}
                    placeholder="Décrivez les difficultés et obstacles rencontrés..."
                  />
                </div>

                {/* Enseignements */}
                <div className="space-y-2">
                  <Label>
                    Enseignements {isFieldRequired('lessons_learned') && <span className="text-destructive">*</span>}
                  </Label>
                  <TiptapEditor
                    content={watch('lessons_learned') || ''}
                    onChange={(content) => setValue('lessons_learned', content)}
                    placeholder="Quels sont les enseignements à retenir de cette intervention ?"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Timeline chronologique - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <TimelineEditor
            value={chronologie}
            onChange={(value) => setValue('chronologie', value)}
          />
        </Card>
      )}

      {/* Focus Thématiques - Requis pour RETEX */}
      {typeProduction === 'retex' && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Focus thématiques</CardTitle>
            <CardDescription>
              Analyse détaillée par thème selon le mémento DGSCGC
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FocusThematiqueEditor
              value={focusThematiques}
              onChange={(value) => setValue('focus_thematiques', value)}
              disabled={isSubmitting}
              required={isFieldRequired('focus_thematiques')}
            />
          </CardContent>
        </Card>
      )}

      {/* Prescriptions - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <PrescriptionsEditor
            value={prescriptions}
            onChange={(value) => setValue('prescriptions', value)}
          />
        </Card>
      )}

      {/* Documentation opérationnelle - Visible pour RETEX */}
      {typeProduction === 'retex' && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Documentation opérationnelle</CardTitle>
            <CardDescription>
              Références bibliographiques (GNR, GDO, GTO, RO...)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TiptapEditor
              content={watch('documentation_operationnelle') || ''}
              onChange={(content) => setValue('documentation_operationnelle', content)}
              placeholder="Listez les références documentaires utilisées ou à consulter..."
            />
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Pièces jointes</CardTitle>
          <CardDescription>
            Photos, schémas, documents complémentaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            rexId={rexId}
            files={uploadedFiles}
            onFilesChange={setUploadedFiles}
            maxFiles={10}
            maxSizeMB={5}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSubmit((data) => onSubmit(data, 'draft'))}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer brouillon
        </Button>
        <Button
          type="button"
          onClick={handleSubmit((data) => onSubmit(data, 'pending'))}
          disabled={isSubmitting}
          className="bg-gradient-to-r from-primary to-red-800"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Soumettre pour validation
        </Button>
      </div>
    </form>
  );
}
