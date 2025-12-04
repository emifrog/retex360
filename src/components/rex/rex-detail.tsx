'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CommentList } from '@/components/comments/comment-list';
import { ExportPdfButton } from './export-pdf-button';
import { AttachmentsList } from './attachments-list';
import { ValidationActions } from './validation-actions';
import { AiAnalysis } from './ai-analysis';
import {
  ArrowLeft,
  Calendar,
  Eye,
  Star,
  Share2,
  Pencil,
  CheckCircle,
  Clock,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Rex, Sdis, Profile } from '@/types';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
}

interface RexDetailProps {
  rex: Rex & {
    author?: Profile;
    sdis?: Sdis;
    validator?: Profile;
    attachments?: Attachment[];
  };
  isFavorited: boolean;
  currentUser: Profile | null;
}

const severityConfig = {
  critique: {
    label: 'Critique',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  majeur: {
    label: 'Majeur',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  significatif: {
    label: 'Significatif',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
};

const statusConfig = {
  draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-500' },
  pending: { label: 'En attente de validation', icon: Clock, color: 'text-orange-500' },
  validated: { label: 'Validé', icon: CheckCircle, color: 'text-green-500' },
  archived: { label: 'Archivé', icon: Clock, color: 'text-gray-400' },
};

export function RexDetail({ rex, isFavorited: initialFavorited, currentUser }: RexDetailProps) {
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [favoritesCount, setFavoritesCount] = useState(rex.favorites_count || 0);

  const severity = severityConfig[rex.severity];
  const status = statusConfig[rex.status];
  const StatusIcon = status.icon;

  const isAuthor = currentUser?.id === rex.author_id;
  const canEdit = isAuthor || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const authorInitials = rex.author?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleFavorite = async () => {
    if (!currentUser) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }

    try {
      const response = await fetch(`/api/rex/${rex.id}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        setIsFavorited(!isFavorited);
        setFavoritesCount((prev) => (isFavorited ? prev - 1 : prev + 1));
        toast.success(isFavorited ? 'Retiré des favoris' : 'Ajouté aux favoris');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papier');
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm text-muted-foreground">Retour à la liste</span>
      </div>

      {/* Header Card */}
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        {/* Top accent */}
        <div
          className={cn('h-1', severity.color)}
          style={{
            boxShadow: `0 0 20px ${
              rex.severity === 'critique'
                ? '#ef4444'
                : rex.severity === 'majeur'
                ? '#f97316'
                : '#eab308'
            }40`,
          }}
        />

        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(severity.bgColor, severity.textColor, severity.borderColor)}
                >
                  {severity.label}
                </Badge>
                <Badge variant="outline" className="bg-muted/50">
                  {rex.type}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'flex items-center gap-1',
                    rex.status === 'validated'
                      ? 'bg-green-500/10 text-green-500 border-green-500/30'
                      : rex.status === 'pending'
                      ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                      : 'bg-muted/50'
                  )}
                >
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
              </div>

              {/* Title */}
              <CardTitle className="text-2xl leading-tight">{rex.title}</CardTitle>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {rex.sdis && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    SDIS {rex.sdis.code} - {rex.sdis.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(rex.intervention_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {rex.views_count} vues
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  {favoritesCount} favoris
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleFavorite}
                className={cn(
                  isFavorited && 'bg-yellow-500/10 border-yellow-500/30'
                )}
              >
                <Star
                  className={cn(
                    'w-4 h-4',
                    isFavorited ? 'fill-yellow-500 text-yellow-500' : ''
                  )}
                />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              <ExportPdfButton rexId={rex.id} rexTitle={rex.title} />
              {canEdit && (
                <Link href={`/rex/${rex.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Author */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/20 text-primary">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{rex.author?.full_name || 'Auteur inconnu'}</p>
              <p className="text-sm text-muted-foreground">
                {rex.author?.grade && `${rex.author.grade} • `}
                Publié le{' '}
                {new Date(rex.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Tags */}
          {rex.tags && rex.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rex.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Sections */}
      {rex.description && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Synthèse</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: rex.description }}
            />
          </CardContent>
        </Card>
      )}

      {rex.context && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Contexte opérationnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: rex.context }}
            />
          </CardContent>
        </Card>
      )}

      {rex.means_deployed && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Moyens engagés</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: rex.means_deployed }}
            />
          </CardContent>
        </Card>
      )}

      {rex.difficulties && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Difficultés rencontrées</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: rex.difficulties }}
            />
          </CardContent>
        </Card>
      )}

      {rex.lessons_learned && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Enseignements</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: rex.lessons_learned }}
            />
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {rex.attachments && rex.attachments.length > 0 && (
        <AttachmentsList attachments={rex.attachments} />
      )}

      {/* Validation Info */}
      {rex.status === 'validated' && rex.validator && (
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-500">
                  Validé par {rex.validator.full_name}
                </p>
                {rex.validated_at && (
                  <p className="text-xs text-muted-foreground">
                    Le {new Date(rex.validated_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      <AiAnalysis rexId={rex.id} />

      {/* Validation Actions (for admins) */}
      <ValidationActions
        rexId={rex.id}
        currentStatus={rex.status}
        isAdmin={currentUser?.role === 'admin' || currentUser?.role === 'super_admin'}
        isAuthor={isAuthor}
      />

      <Separator />

      {/* Comments */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-6">
          <CommentList rexId={rex.id} currentUser={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}
