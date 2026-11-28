import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { SANITIZE_CONFIG, registerSafeLinkHook } from './sanitize-config';
import { REX_HTML_FIELDS } from './rex-rich-fields';

/**
 * Server-side HTML sanitizer for the write path.
 *
 * The Tiptap editor produces HTML on the client, which is untrusted input: a
 * caller can POST arbitrary HTML straight to the API. We sanitize before storage
 * so the database never holds active markup, regardless of which consumer (PDF,
 * future SSR, email, another client) later renders it. This complements — not
 * replaces — the client-side sanitization done at render time.
 */
const { window } = new JSDOM('');
const purify = createDOMPurify(window as unknown as Parameters<typeof createDOMPurify>[0]);
registerSafeLinkHook(purify);

export function sanitizeHtmlServer(dirty: string): string {
  return purify.sanitize(dirty, SANITIZE_CONFIG);
}

// Pas d'assainisseur « texte brut » ici, et c'est voulu. Il en existait un pour
// les commentaires : passer du texte par un analyseur HTML l'abîmait (« < »
// stocké « &lt; », passage entre chevrons supprimé). Un champ de texte brut se
// stocke tel quel et s'échappe à l'affichage — voir `normalizeCommentText`.

/**
 * Returns a copy of a REX body with every HTML rich-text field sanitized.
 * Non-string / empty values are left untouched. Plain-text fields that happen
 * to be sanitized pass through unchanged.
 */
export function sanitizeRexHtmlFields<T extends Record<string, unknown>>(body: T): T {
  const out: Record<string, unknown> = { ...body };
  for (const field of REX_HTML_FIELDS) {
    const value = out[field];
    if (typeof value === 'string' && value.length > 0) {
      out[field] = sanitizeHtmlServer(value);
    }
  }
  return out as T;
}
