import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { SANITIZE_CONFIG, registerSafeLinkHook } from './sanitize-config';

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

/**
 * Strips ALL HTML, returning plain text. Use for fields that are plain text by
 * design (e.g. comments): even though they are rendered as React text nodes
 * today, stripping markup at the write path keeps the stored value safe for any
 * future consumer.
 */
export function sanitizePlainText(dirty: string): string {
  return purify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// Rich-text (HTML) fields produced by the Tiptap editor on a REX payload.
const REX_HTML_FIELDS = [
  'description',
  'context',
  'means_deployed',
  'difficulties',
  'lessons_learned',
  'message_ambiance',
  'sitac',
  'elements_favorables',
  'elements_defavorables',
  'documentation_operationnelle',
  'description_site',
] as const;

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
