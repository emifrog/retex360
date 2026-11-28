import { cn } from '@/lib/utils';

/**
 * Affiche une rubrique de texte riche d'un REX.
 *
 * CONTRAT : `html` doit arriver DÉJÀ ASSAINI. Il est injecté tel quel.
 * L'assainissement se fait côté serveur, dans la page qui charge le REX
 * (`sanitizeRexHtmlFields`). `rex-detail-sections.test.ts` vérifie que toute
 * rubrique affichée par la fiche figure bien dans la liste assainie.
 *
 * La mise en forme (titres, listes, liens) vient de `.rich-text`, dans
 * `globals.css`.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
