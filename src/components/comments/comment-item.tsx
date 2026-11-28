'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, MoreHorizontal, Pencil, Trash2, Shield, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentForm } from './comment-form';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CommentWithAuthor } from '@/types';
import { splitMentions } from '@/lib/comments';

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId?: string;
  onReply: (parentId: string, content: string, mentions?: string[]) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  /** Admin du SDIS du REX ou super-admin : peut supprimer le commentaire d'un autre. */
  canModerate?: boolean;
  /** Abonnement en lecture seule : ni réponse, ni modification, ni suppression. */
  canWrite?: boolean;
  depth?: number;
}

// Le contenu est du texte : React l'échappe. Seules les mentions reçoivent un
// habillage, et leur découpage vient de `splitMentions`.
function renderContentWithMentions(content: string): React.ReactNode {
  return splitMentions(content).map((part, index) =>
    part.kind === 'mention' ? (
      <span key={index} className="font-medium text-[var(--link)]">
        {part.text}
      </span>
    ) : (
      part.text
    )
  );
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  canModerate = false,
  canWrite = true,
  depth = 0,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAuthor = currentUserId === comment.author_id;
  const authorInitials =
    comment.author?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const handleReply = async (content: string, mentions: string[] = []) => {
    await onReply(comment.id, content, mentions);
    setIsReplying(false);
  };

  const handleEdit = async (content: string) => {
    await onEdit(comment.id, content);
    setIsEditing(false);
  };

  return (
    <div className={depth > 0 ? 'ml-8 border-l border-border pl-4' : ''}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 shrink-0">
          {comment.author?.avatar_url && (
            <AvatarImage src={comment.author.avatar_url} alt={comment.author.full_name} />
          )}
          <AvatarFallback className="bg-muted text-xs">{authorInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm">
              {comment.author?.full_name || 'Utilisateur'}
            </span>
            {comment.author?.grade && (
              <span className="text-xs text-muted-foreground">{comment.author.grade}</span>
            )}
            {comment.author?.role === 'admin' || comment.author?.role === 'super_admin' ? (
              <Badge
                variant="outline"
                className="h-5 text-xs bg-primary/10 text-primary border-primary/30"
              >
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            ) : comment.author?.role === 'validator' ? (
              <Badge
                variant="outline"
                className="h-5 text-xs bg-green-500/10 text-green-800 dark:text-green-400 border-green-500/30"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Validateur
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-muted-foreground italic">(modifié)</span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <CommentForm
              rexId=""
              onSubmit={handleEdit}
              onCancel={() => setIsEditing(false)}
              placeholder="Modifier votre commentaire..."
              label="Modifier votre commentaire"
              initialContent={comment.content}
              userInitials={authorInitials}
            />
          ) : (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {renderContentWithMentions(comment.content)}
            </p>
          )}

          {/* Actions */}
          {!isEditing && canWrite && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsReplying(!isReplying)}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Répondre
              </Button>

              {/* L'auteur modifie et supprime ; l'admin du SDIS supprime
                  seulement (modération). La route et la base l'autorisaient
                  déjà, mais le menu n'était montré qu'à l'auteur. */}
              {(isAuthor || canModerate) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Actions sur le commentaire de ${comment.author?.full_name || 'cet utilisateur'}`}
                      className="h-7 w-7 p-0 text-muted-foreground"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {isAuthor && (
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isAuthor ? 'Supprimer' : 'Supprimer (modération)'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3">
              <CommentForm
                rexId=""
                parentId={comment.id}
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
                placeholder="Écrire une réponse..."
                label={`Répondre à ${comment.author?.full_name || 'ce commentaire'}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              canModerate={canModerate}
              canWrite={canWrite}
              // Un seul niveau de retrait : toutes les réponses d'un fil sont
              // au même plan, quelle que soit celle à laquelle elles répondent.
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
