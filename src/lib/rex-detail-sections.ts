import type { RexHtmlField } from './rex-rich-fields';

/**
 * Ce que la fiche d'un REX affiche, et dans quel ordre.
 *
 * La fiche énumérait auparavant ses rubriques à la main et n'en rendait que six
 * sur quatorze : objectifs, message d'ambiance, SITAC, éléments favorables et
 * défavorables, données et sources, méthode et documentation n'existaient que
 * dans le PDF. Elle se construit désormais à partir de cette liste, tenue
 * alignée sur les champs du formulaire par `rex-detail-sections.test.ts`.
 *
 * Ordre : celui de la lecture d'un dossier — ce qui s'est passé, comment on l'a
 * étudié, ce qu'on en retient — et non celui de la saisie.
 */
export type RexDetailBlock =
  | {
      kind: 'html';
      field: RexHtmlField;
      title: string;
      /** Teinte de la rubrique : facilitateurs en vert, perturbateurs en rouge. */
      tone?: 'favorable' | 'defavorable';
    }
  | { kind: 'chronologie' }
  | { kind: 'focus' }
  | { kind: 'prescriptions' }
  | { kind: 'temoignages' }
  | { kind: 'ressources' };

export const REX_DETAIL_LAYOUT: readonly RexDetailBlock[] = [
  { kind: 'html', field: 'description', title: 'Synthèse' },
  { kind: 'html', field: 'objectifs', title: 'Objectifs du RETEX' },
  { kind: 'html', field: 'message_ambiance', title: "Message d'ambiance" },
  { kind: 'html', field: 'sitac', title: 'SITAC — situation tactique' },
  { kind: 'html', field: 'context', title: 'Contexte opérationnel' },
  { kind: 'html', field: 'means_deployed', title: 'Moyens engagés' },
  { kind: 'chronologie' },
  { kind: 'html', field: 'donnees_sources', title: 'Données et sources' },
  { kind: 'html', field: 'methode_argumentation', title: 'Argumentation de la méthode' },
  { kind: 'html', field: 'elements_favorables', title: 'Éléments favorables', tone: 'favorable' },
  {
    kind: 'html',
    field: 'elements_defavorables',
    title: 'Éléments défavorables',
    tone: 'defavorable',
  },
  { kind: 'html', field: 'difficulties', title: 'Difficultés rencontrées' },
  { kind: 'focus' },
  { kind: 'html', field: 'lessons_learned', title: 'Enseignements' },
  { kind: 'prescriptions' },
  { kind: 'temoignages' },
  { kind: 'html', field: 'description_site', title: "Description de l'ouvrage / site" },
  { kind: 'html', field: 'documentation_operationnelle', title: 'Documentation opérationnelle' },
  { kind: 'ressources' },
];

/** Champ de la ligne `rex` qui porte chaque rubrique structurée. */
const STRUCTURED_FIELD = {
  chronologie: 'chronologie',
  focus: 'focus_thematiques',
  prescriptions: 'prescriptions',
  temoignages: 'temoignages',
  ressources: 'ressources_complementaires',
} as const;

/**
 * Vrai si un contenu d'éditeur ne porte aucun texte.
 *
 * Tiptap enregistre `<p></p>` pour un éditeur laissé vide : un simple test de
 * vérité affichait alors une carte titrée et sans contenu.
 */
export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim().length === 0
  );
}

type RexContent = Partial<Record<RexHtmlField, string | null>> & {
  [K in (typeof STRUCTURED_FIELD)[keyof typeof STRUCTURED_FIELD]]?: unknown;
};

/** Les rubriques de `REX_DETAIL_LAYOUT` qui ont un contenu, dans l'ordre d'affichage. */
export function blocksToDisplay(rex: RexContent): RexDetailBlock[] {
  return REX_DETAIL_LAYOUT.filter((block) => {
    if (block.kind === 'html') return !isEmptyHtml(rex[block.field]);
    const value = rex[STRUCTURED_FIELD[block.kind]];
    return Array.isArray(value) && value.length > 0;
  });
}

/**
 * Lieu de l'intervention : libellé et commune réunis.
 *
 * La commune n'est pas répétée quand le libellé se termine déjà par elle — le
 * formulaire les demande séparément, mais beaucoup d'adresses sont saisies
 * entières. Seule la fin compte : « Parking Nice Étoile » contient « Nice »
 * sans dire dans quelle commune il se trouve.
 */
export function interventionPlace(rex: {
  localisation?: string | null;
  commune?: string | null;
}): string | null {
  const lieu = rex.localisation?.trim() || '';
  const commune = rex.commune?.trim() || '';
  if (!lieu && !commune) return null;
  if (!lieu) return commune;
  if (!commune || lieu.toLocaleLowerCase('fr').endsWith(commune.toLocaleLowerCase('fr'))) {
    return lieu;
  }
  return `${lieu}, ${commune}`;
}

/** Heure au format français (« 14 h 30 ») à partir du `time` rendu par la base. */
export function interventionTime(heure: string | null | undefined): string | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(heure ?? '');
  if (!match) return null;
  return `${Number(match[1])} h ${match[2]}`;
}

interface FocusContent {
  id: string;
  theme: string;
  problematique?: string;
  actions_menees?: string;
  axes_amelioration?: string;
  constats?: string;
  points_forts?: string;
  points_amelioration?: string;
  propositions?: string;
}

const FOCUS_PARTS = [
  // Les trois rubriques que l'éditeur fait saisir.
  { key: 'problematique', label: 'Problématique' },
  { key: 'actions_menees', label: 'Actions menées' },
  { key: 'axes_amelioration', label: "Axes d'amélioration" },
  // Les quatre de l'annexe F, présentes sur des dossiers importés.
  { key: 'constats', label: 'Constats' },
  { key: 'points_forts', label: 'Points forts' },
  { key: 'points_amelioration', label: "Points d'amélioration" },
  { key: 'propositions', label: 'Propositions' },
] as const;

export type FocusPartKey = (typeof FOCUS_PARTS)[number]['key'];

/**
 * Contenu d'un focus thématique à afficher : ses rubriques renseignées, avec
 * leur libellé. Partagé par la fiche et le PDF, qui ne lisait que les champs de
 * l'annexe F — ceux que le formulaire ne permet pas de saisir.
 */
export function focusEntries(
  focus: FocusContent
): { key: FocusPartKey; label: string; text: string }[] {
  return FOCUS_PARTS.flatMap(({ key, label }) => {
    const text = focus[key]?.trim();
    return text ? [{ key, label, text }] : [];
  });
}

/**
 * Rappel montré au validateur avant qu'il approuve.
 *
 * La visibilité n'apparaissait que dans le formulaire de l'auteur : le
 * validateur ouvrait un REX à tous les SDIS sans le savoir.
 */
export function validationShareNotice(visibility: string | null | undefined): string {
  switch (visibility) {
    case 'sdis':
      return 'Une fois validé, ce REX restera réservé aux agents de son SDIS.';
    case 'inter_sdis':
    case 'public':
      return 'Une fois validé, ce REX sera visible des agents de tous les SDIS.';
    default:
      return 'La visibilité de ce REX est inconnue : vérifiez-la avant de valider.';
  }
}
