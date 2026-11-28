import type { ProductionType } from '@/types';
import { validateRexByType } from './validators/rex';
import { isEmptyHtml } from './rex-detail-sections';

/**
 * Erreurs du formulaire REX, champ par champ.
 *
 * Le formulaire n'avait aucune validation côté navigateur et n'affichait du
 * refus de l'API que son message général, « Données invalides ». Ce module
 * applique dans le navigateur les MÊMES schémas que le serveur
 * (`validateRexByType`) et rend, pour chaque champ, un message à afficher sous
 * lui.
 */

/** Libellé court de chaque champ, pour le résumé des erreurs. */
export const REX_FIELD_LABELS: Record<string, string> = {
  title: 'Intitulé',
  intervention_date: "Date d'intervention",
  intervention_heure: "Heure d'intervention",
  localisation: 'Lieu',
  commune: 'Commune',
  type: "Type d'intervention",
  severity: 'Niveau de criticité',
  visibility: 'Visibilité',
  tags: 'Tags',
  description: 'Description',
  context: 'Contexte opérationnel',
  means_deployed: 'Moyens engagés',
  difficulties: 'Difficultés rencontrées',
  lessons_learned: 'Enseignements',
  message_ambiance: "Message d'ambiance",
  sitac: 'SITAC',
  elements_favorables: 'Éléments favorables',
  elements_defavorables: 'Éléments défavorables',
  documentation_operationnelle: 'Documentation opérationnelle',
  objectifs: 'Objectifs du RETEX',
  donnees_sources: 'Données et sources',
  methode_argumentation: 'Argumentation de la méthode',
  focus_thematiques: 'Focus thématiques',
};

/** « … est requis » pour chaque champ qui peut l'être, sans la fin de phrase. */
const REQUIRED_PHRASE: Record<string, string> = {
  title: "L'intitulé est requis",
  intervention_date: "La date d'intervention est requise",
  type: "Le type d'intervention est requis",
  severity: 'Le niveau de criticité est requis',
  description: 'La description est requise',
  context: 'Le contexte opérationnel est requis',
  means_deployed: 'Les moyens engagés sont requis',
  lessons_learned: 'Les enseignements sont requis',
  objectifs: 'Les objectifs du RETEX sont requis',
  donnees_sources: 'Les données et sources sont requises',
  methode_argumentation: "L'argumentation de la méthode est requise",
};

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && isEmptyHtml(value));

export type RexFieldErrors = Record<string, string>;

/**
 * Erreurs de `data` pour l'action demandée, une par champ. Objet vide si tout
 * est bon.
 *
 * Un champ requis laissé vide reçoit « … est requis », et non le message de
 * seuil du schéma : « Date invalide » sous un champ que l'on n'a pas rempli
 * n'apprend rien. Pour un brouillon, le message précise que le champ est exigé
 * malgré tout — la base ne sait pas enregistrer un REX sans titre, date, type
 * ni criticité.
 */
export function rexFieldErrors(data: unknown, status: 'draft' | 'pending'): RexFieldErrors {
  const result = validateRexByType(data, status === 'draft');
  if (result.success) return {};

  const values = (data ?? {}) as Record<string, unknown>;
  const suffix = status === 'draft' ? ', même pour un brouillon.' : ' pour soumettre.';
  const errors: RexFieldErrors = {};

  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (!field || errors[field]) continue;

    if (field === 'focus_thematiques') {
      errors[field] =
        issue.path.length > 1
          ? `Focus n° ${Number(issue.path[1]) + 1} : ${issue.message}`
          : Array.isArray(values[field])
            ? issue.message
            : 'Au moins un focus thématique est requis pour un RETEX';
      continue;
    }

    errors[field] =
      REQUIRED_PHRASE[field] && isBlank(values[field])
        ? `${REQUIRED_PHRASE[field]}${suffix}`
        : issue.message;
  }

  return errors;
}

/**
 * Erreurs par champ renvoyées par l'API (`errors` d'une réponse 400), ramenées
 * à un message par champ. Tolère une forme inattendue : le navigateur a déjà
 * validé, ce chemin ne sert que si les deux validations divergent.
 */
export function fieldErrorsFromServer(errors: unknown): RexFieldErrors {
  if (!errors || typeof errors !== 'object') return {};
  const out: RexFieldErrors = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') out[field] = messages[0];
  }
  return out;
}

/**
 * Longueurs minimales exigées à la soumission. Miroir des schémas de
 * `validators/rex.ts` : `rex-form-errors.test.ts` vérifie, pour chaque entrée,
 * que le schéma accepte exactement à partir de ce seuil.
 */
const PEX_MIN = {
  title: 10,
  description: 50,
  context: 20,
  means_deployed: 20,
  lessons_learned: 20,
};
const MIN_LENGTHS: Record<ProductionType, Record<string, number>> = {
  signalement: { title: 10, description: 20 },
  pex: PEX_MIN,
  retex: { ...PEX_MIN, objectifs: 20, donnees_sources: 20, methode_argumentation: 20 },
};

/** Seuil à annoncer sous un champ, ou `null` s'il n'en a pas pour ce niveau. */
export function rexFieldHint(field: string, typeProduction: ProductionType): string | null {
  const min = MIN_LENGTHS[typeProduction]?.[field];
  return min ? `${min} caractères minimum` : null;
}
