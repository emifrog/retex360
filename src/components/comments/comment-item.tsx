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

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId?: string;
  onReply: (parentId: string, content: string, mentions?: string[]) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  depth?: number;
}

// Render content with highlighted mentions
function renderContentWithMentions(content: string): React.ReactNode {
  const mentionPattern = /@(\w+(?:_\w+)*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    // Add the mention with styling
    const mentionName = match[1].replace(/_/g, ' ');
    parts.push(
      <span key={match.index} className="text-primary font-medium">
        @{mentionName}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  depth = 0,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAuthor = currentUserId === comment.author_id;
  const authorInitials = comment.author?.full_name
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
          <AvatarFallback className="bg-muted text-xs">
            {authorInitials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm">
              {comment.author?.full_name || 'Utilisateur'}
            </span>
            {comment.author?.grade && (
              <span className="text-xs text-muted-foreground">
                {comment.author.grade}
              </span>
            )}
            {comment.author?.role === 'admin' || comment.author?.role === 'super_admin' ? (
              <Badge variant="outline" className="h-5 text-[10px] bg-primary/10 text-primary border-primary/30">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            ) : comment.author?.role === 'validator' ? (
              <Badge variant="outline" className="h-5 text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
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
              userInitials={authorInitials}
            />
          ) : (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {renderContentWithMentions(comment.content)}
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
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

              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
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
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
