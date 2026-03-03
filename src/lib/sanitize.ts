import DOMPurify from 'dompurify';

/**
 * Sanitise du contenu HTML pour prévenir les attaques XSS.
 * Utilisé principalement pour le rendu du contenu Tiptap.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'del',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'span', 'div', 'sub', 'sup',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title',
      'class', 'style', 'width', 'height',
    ],
    ALLOW_DATA_ATTR: false,
  });
}
