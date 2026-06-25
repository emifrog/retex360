import type { Config, DOMPurify } from 'dompurify';

/**
 * Shared DOMPurify allowlist used by both the client renderer (sanitize.ts) and
 * the server-side write-path sanitizer (sanitize-server.ts). Keeping a single
 * config avoids drift between what we store and what we render.
 */
export const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'del',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
    'span',
    'div',
    'sub',
    'sup',
  ],
  // `style` is intentionally NOT allowed: inline CSS is an injection/exfiltration
  // surface (e.g. positioning for clickjacking, url() leaks).
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'width', 'height'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Forces safe attributes on links to prevent reverse tabnabbing: any anchor
 * keeps/gets rel="noopener noreferrer". Registered on each DOMPurify instance.
 */
export function registerSafeLinkHook(purify: DOMPurify): void {
  purify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('rel', 'noopener noreferrer');
      if (node.hasAttribute('target')) node.setAttribute('target', '_blank');
    }
  });
}
