'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { CommentForm } from './comment-form';
import { CommentItem } from './comment-item';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CommentWithAuthor, ReadableProfile } from '@/types';
import { appendReply, canModerateComments, countComments } from '@/lib/comments';

interface CommentListProps {
  rexId: string;
  currentUser?: ReadableProfile | null;
  canWrite?: boolean;
  /** SDIS du REX : décide qui peut modérer. */
  rexSdisId?: string | null;
}

export function CommentList({ rexId, currentUser, canWrite = true, rexSdisId }: CommentListProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Une erreur de chargement s'affichait comme « Aucun commentaire ».
  const [loadFailed, setLoadFailed] = useState(false);
  const canModerate = canModerateComments(currentUser, rexSdisId);

  const userInitials =
    currentUser?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/rex/${rexId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
      }
    } catch (error) {
      logger.error('Fetch comments error:', error);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [rexId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (content: string, mentions: string[] = []) => {
    try {
      const response = await fetch(`/api/rex/${rexId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mentions }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout");
      }

      const data = await response.json();
      setComments([{ ...data.data, replies: [] }, ...comments]);
      toast.success('Commentaire ajouté');
    } catch {
      toast.error("Erreur lors de l'ajout du commentaire");
    }
  };

  const handleReply = async (parentId: string, content: string, mentions: string[] = []) => {
    try {
      const response = await fetch(`/api/rex/${rexId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parent_id: parentId, mentions }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout");
      }

      const data = await response.json();
      // `appendReply` retrouve le fil même quand on répond à une réponse :
      // seule la réponse directe à un commentaire de premier niveau s'affichait.
      setComments(
        appendReply(
          comments.map((c) => ({ ...c, replies: c.replies ?? [] })),
          parentId,
          data.data as CommentWithAuthor
        )
      );
      toast.success('Réponse ajoutée');
    } catch {
      toast.error("Erreur lors de l'ajout de la réponse");
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la modification');
      }

      const updateComment = (items: CommentWithAuthor[]): CommentWithAuthor[] => {
        return items.map((item) => {
          if (item.id === commentId) {
            return { ...item, content, is_edited: true, updated_at: new Date().toISOString() };
          }
          if (item.replies) {
            return { ...item, replies: updateComment(item.replies) };
          }
          return item;
        });
      };

      setComments(updateComment(comments));
      toast.success('Commentaire modifié');
    } catch {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      const deleteComment = (items: CommentWithAuthor[]): CommentWithAuthor[] => {
        return items
          .filter((item) => item.id !== commentId)
          .map((item) => ({
            ...item,
            replies: item.replies ? deleteComment(item.replies) : undefined,
          }));
      };

      setComments(deleteComment(comments));
      toast.success('Commentaire supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Commentaires ({countComments(comments)})</h3>
      </div>

      {/* Add Comment Form */}
      {currentUser && canWrite && (
        <CommentForm rexId={rexId} onSubmit={handleAddComment} userInitials={userInitials} />
      )}
      {currentUser && !canWrite && (
        <p className="text-sm text-muted-foreground rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          Abonnement en lecture seule — l&apos;ajout de commentaires est désactivé.
        </p>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Comments List */}
      {!isLoading && (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.id}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canModerate={canModerate}
              canWrite={Boolean(currentUser) && canWrite}
            />
          ))}
        </div>
      )}

      {/* Échec du chargement — distinct de l'absence de commentaires. */}
      {!isLoading && loadFailed && (
        <div role="alert" className="text-center py-8 space-y-3">
          <p className="text-sm text-foreground">
            Les commentaires n&apos;ont pas pu être chargés.
          </p>
          <button
            type="button"
            className="text-sm font-medium underline underline-offset-2"
            onClick={() => {
              setIsLoading(true);
              fetchComments();
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !loadFailed && comments.length === 0 && (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucun commentaire pour le moment.
            <br />
            Soyez le premier à partager votre avis !
          </p>
        </div>
      )}
    </div>
  );
}
