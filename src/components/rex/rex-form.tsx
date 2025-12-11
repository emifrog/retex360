'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { RexInput } from '@/lib/validators/rex';
import { REX_TYPES, SEVERITIES, VISIBILITIES } from '@/types';
import { TiptapEditor } from './tiptap-editor';
import { ImageUpload } from './image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, Send, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RexFormProps {
  initialData?: Partial<RexInput>;
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
  } = useForm({
    defaultValues: {
      title: initialData?.title || '',
      intervention_date: initialData?.intervention_date || '',
      type: initialData?.type || undefined,
      severity: initialData?.severity || undefined,
      visibility: initialData?.visibility || 'sdis',
      description: initialData?.description || '',
      context: initialData?.context || '',
      means_deployed: initialData?.means_deployed || '',
      difficulties: initialData?.difficulties || '',
      lessons_learned: initialData?.lessons_learned || '',
      tags: initialData?.tags || [],
    },
  });

  const tags = watch('tags') || [];

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue('tags', [...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter((tag) => tag !== tagToRemove));
  };

  const onSubmit = async (data: Record<string, unknown>, status: 'draft' | 'pending') => {
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
      {/* Basic Info */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Intitulé de l&apos;intervention *</Label>
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
              <Label htmlFor="intervention_date">Date d&apos;intervention *</Label>
              <Input
                id="intervention_date"
                type="date"
                {...register('intervention_date')}
                className="bg-background/50"
              />
              {errors.intervention_date && (
                <p className="text-sm text-destructive">{errors.intervention_date.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type d&apos;intervention *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as typeof REX_TYPES[number])}
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
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label>Niveau de criticité *</Label>
              <Select
                value={watch('severity')}
                onValueChange={(value) => setValue('severity', value as typeof SEVERITIES[number])}
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
              {errors.severity && (
                <p className="text-sm text-destructive">{errors.severity.message}</p>
              )}
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibilité</Label>
            <Select
              value={watch('visibility')}
              onValueChange={(value) => setValue('visibility', value as typeof VISIBILITIES[number])}
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

      {/* Content Sections */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Contenu du RETEX</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <Label>Synthèse *</Label>
            <TiptapEditor
              content={watch('description') || ''}
              onChange={(content) => setValue('description', content)}
              placeholder="Décrivez brièvement l'intervention et ses enjeux principaux..."
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Context */}
          <div className="space-y-2">
            <Label>Contexte opérationnel</Label>
            <TiptapEditor
              content={watch('context') || ''}
              onChange={(content) => setValue('context', content)}
              placeholder="Décrivez le contexte de l'intervention (lieu, conditions, situation initiale)..."
            />
          </div>

          {/* Means Deployed */}
          <div className="space-y-2">
            <Label>Moyens engagés</Label>
            <TiptapEditor
              content={watch('means_deployed') || ''}
              onChange={(content) => setValue('means_deployed', content)}
              placeholder="Listez les moyens humains et matériels engagés..."
            />
          </div>

          {/* Difficulties */}
          <div className="space-y-2">
            <Label>Difficultés rencontrées</Label>
            <TiptapEditor
              content={watch('difficulties') || ''}
              onChange={(content) => setValue('difficulties', content)}
              placeholder="Décrivez les difficultés et obstacles rencontrés..."
            />
          </div>

          {/* Lessons Learned */}
          <div className="space-y-2">
            <Label>Enseignements</Label>
            <TiptapEditor
              content={watch('lessons_learned') || ''}
              onChange={(content) => setValue('lessons_learned', content)}
              placeholder="Quels sont les enseignements à retenir de cette intervention ?"
            />
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Pièces jointes</CardTitle>
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
      <div className="flex items-center justify-end gap-3">
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
