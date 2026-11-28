'use client';

import { useEffect } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading2, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  /** Identifiant de la zone de saisie : permet d'y amener le curseur depuis un message d'erreur. */
  id?: string;
  /** Identifiant de l'élément qui nomme le champ. Un `<label>` ne peut pas viser une zone éditable. */
  labelledBy?: string;
  /** Identifiants de l'aide et du message d'erreur, séparés par une espace. */
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Commencez à écrire...',
  className,
  id,
  labelledBy,
  describedBy,
  invalid = false,
  required = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        // `rich-text` (globals.css) donne leur forme aux titres et aux listes.
        // La classe `prose` posée ici venait d'un module jamais installé : les
        // boutons « titre » et « liste » semblaient sans effet.
        // Pas d'`outline` propre : l'indicateur de focus est porté par le cadre
        // de l'éditeur (`focus-within`, plus bas).
        class: 'rich-text min-h-[150px] p-4 outline-none',
        // Une zone éditable n'a ni rôle ni nom par elle-même : un lecteur
        // d'écran annonçait quinze « zones de texte » indistinctes.
        role: 'textbox',
        'aria-multiline': 'true',
        ...(id ? { id } : {}),
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(required ? { 'aria-required': 'true' } : {}),
      },
    },
  });

  // `aria-invalid` change au fil de la saisie, alors que les attributs ci-dessus
  // sont fixés à la création de l'éditeur : il est tenu à jour ici.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom;
    if (invalid) dom.setAttribute('aria-invalid', 'true');
    else dom.removeAttribute('aria-invalid');
  }, [editor, invalid]);

  // État de la barre d'outils, lu par `useEditorState` : le composant est
  // re-rendu quand l'un de ces drapeaux change. Les lire directement sur
  // `editor` pendant le rendu ne suffit pas — l'objet reste le même d'une frappe
  // à l'autre, et le compilateur React mémorise ce qui en dépend : un bouton
  // « liste » enfoncé ne s'affichait jamais comme tel.
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold') ?? false,
      italic: current?.isActive('italic') ?? false,
      heading: current?.isActive('heading', { level: 2 }) ?? false,
      bulletList: current?.isActive('bulletList') ?? false,
      orderedList: current?.isActive('orderedList') ?? false,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false,
    }),
  });

  if (!editor || !active) {
    return null;
  }

  // Bouton de la barre : toujours nommé, et son état actif est annoncé.
  const tool = (
    label: string,
    Icon: typeof Bold,
    onClick: () => void,
    state: { active?: boolean; disabled?: boolean } = {}
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={state.active === undefined ? undefined : state.active}
      disabled={state.disabled}
      className={cn('h-9 w-9', state.active && 'bg-muted')}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden bg-background/50 transition-shadow',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring',
        invalid ? 'border-destructive' : 'border-border',
        className
      )}
    >
      <div
        role="toolbar"
        aria-label="Mise en forme"
        className="flex items-center gap-1 p-2 border-b border-border bg-muted/30"
      >
        {tool('Gras', Bold, () => editor.chain().focus().toggleBold().run(), {
          active: active.bold,
        })}
        {tool('Italique', Italic, () => editor.chain().focus().toggleItalic().run(), {
          active: active.italic,
        })}
        <div className="w-px h-6 bg-border mx-1" aria-hidden="true" />
        {tool('Titre', Heading2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), {
          active: active.heading,
        })}
        {tool('Liste à puces', List, () => editor.chain().focus().toggleBulletList().run(), {
          active: active.bulletList,
        })}
        {tool(
          'Liste numérotée',
          ListOrdered,
          () => editor.chain().focus().toggleOrderedList().run(),
          { active: active.orderedList }
        )}
        <div className="flex-1" />
        {tool('Annuler la frappe', Undo, () => editor.chain().focus().undo().run(), {
          disabled: !active.canUndo,
        })}
        {tool('Rétablir', Redo, () => editor.chain().focus().redo().run(), {
          disabled: !active.canRedo,
        })}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
