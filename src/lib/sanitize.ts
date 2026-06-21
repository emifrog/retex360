import DOMPurify from 'dompurify';
import { SANITIZE_CONFIG, registerSafeLinkHook } from './sanitize-config';

/**
 * Sanitise du contenu HTML pour prévenir les attaques XSS.
 * Utilisé pour le rendu (côté client) du contenu Tiptap. Le write-path est
 * assaini séparément côté serveur (voir sanitize-server.ts) avec la même config.
 */
registerSafeLinkHook(DOMPurify);

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG);
}
