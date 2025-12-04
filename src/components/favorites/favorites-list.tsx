'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Star, Eye, Calendar, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Favorite {
  id: string;
  created_at: string;
  rex: {
    id: string;
    title: string;
    slug: string | null;
    type: string;
    severity: string;
    status: string;
    intervention_date: string;
    description: string | null;
    views_count: number;
    favorites_count: number;
    created_at: string;
    author: {
      full_name: string;
      avatar_url: string | null;
    };
    sdis: {
      code: string;
      name: string;
    };
  };
}

interface FavoritesListProps {
  favorites: Favorite[];
}

const severityConfig = {
  critique: { label: 'Critique', color: 'bg-red-500/20 text-red-500 border-red-500/30' },
  majeur: { label: 'Majeur', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
  significatif: { label: 'Significatif', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
};

export function FavoritesList({ favorites: initialFavorites }: FavoritesListProps) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const handleRemoveFavorite = async (favoriteId: string, rexId: string) => {
    setRemovingId(favoriteId);
    try {
      const response = await fetch(`/api/rex/${rexId}/favorite`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      toast.success('Retiré des favoris');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  };

  if (favorites.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Star className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun favori</h3>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            Vous n&apos;avez pas encore ajouté de REX à vos favoris. 
            Explorez les retours d&apos;expérience et cliquez sur l&apos;étoile pour les sauvegarder.
          </p>
          <Link href="/rex">
            <Button>Explorer les REX</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {favorites.map((favorite) => {
          const rex = favorite.rex;
          const severity = severityConfig[rex.severity as keyof typeof severityConfig];
          const initials = rex.author.full_name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <Card key={favorite.id} className="border-border/50 bg-card/80 hover:bg-card/90 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={severity?.color}>
                        {severity?.label}
                      </Badge>
                      <Badge variant="outline" className="bg-muted/50">
                        {rex.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        SDIS {rex.sdis.code}
                      </span>
                    </div>

                    <Link href={`/rex/${rex.id}`} className="group">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {rex.title}
                      </h3>
                    </Link>

                    {rex.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {rex.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={rex.author.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                        </Avatar>
                        <span>{rex.author.full_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(rex.intervention_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{rex.views_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        <span>{rex.favorites_count}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Ajouté aux favoris {formatDistanceToNow(new Date(favorite.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Link href={`/rex/${rex.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmRemove(favorite.id)}
                      disabled={removingId === favorite.id}
                    >
                      {removingId === favorite.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Retirer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer des favoris ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce REX sera retiré de votre liste de favoris. Vous pourrez toujours le retrouver et l&apos;ajouter à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const favorite = favorites.find((f) => f.id === confirmRemove);
                if (favorite) {
                  handleRemoveFavorite(favorite.id, favorite.rex.id);
                }
              }}
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
