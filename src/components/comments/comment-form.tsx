'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, AtSign } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface User {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface CommentFormProps {
  rexId: string;
  parentId?: string;
  onSubmit: (content: string, mentions: string[]) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  userInitials?: string;
}

export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = 'Ajouter un commentaire... (utilisez @ pour mentionner)',
  userInitials = 'U',
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Search users for mentions
  const searchUsers = useCallback(async (search: string) => {
    if (!search) {
      setMentionUsers([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${search}%`)
      .limit(5);

    setMentionUsers(data || []);
  }, [supabase]);

  useEffect(() => {
    if (mentionSearch) {
      searchUsers(mentionSearch);
    }
  }, [mentionSearch, searchUsers]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setContent(value);
    setCursorPosition(position);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, position);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionSearch(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const insertMention = (user: User) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const newTextBefore = textBeforeCursor.slice(0, -mentionMatch[0].length);
      const mention = `@${user.full_name.replace(/\s+/g, '_')} `;
      setContent(newTextBefore + mention + textAfterCursor);
    }

    setShowMentions(false);
    setMentionSearch('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions || mentionUsers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((prev) => (prev + 1) % mentionUsers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(mentionUsers[mentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  // Extract mentioned user IDs from content
  const extractMentions = (text: string): string[] => {
    const mentionPattern = /@(\w+(?:_\w+)*)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      const mentionName = match[1].replace(/_/g, ' ');
      const user = mentionUsers.find(u => u.full_name === mentionName);
      if (user) {
        mentions.push(user.id);
      }
    }

    return mentions;
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      const mentions = extractMentions(content);
      await onSubmit(content, mentions);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-muted text-xs">
          {userInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2 relative">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[80px] bg-background/50 resize-none pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const newContent = content + '@';
              setContent(newContent);
              setShowMentions(true);
              setMentionSearch('');
              textareaRef.current?.focus();
            }}
          >
            <AtSign className="h-4 w-4" />
          </Button>

          {/* Mention dropdown */}
          {showMentions && mentionUsers.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
              {mentionUsers.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent ${
                    index === mentionIndex ? 'bg-accent' : ''
                  }`}
                  onClick={() => insertMention(user)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.full_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
