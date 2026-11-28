/**
 * Rubriques de texte riche d'un REX : celles que le formulaire fait saisir dans
 * l'éditeur Tiptap et qui sont donc stockées en HTML.
 *
 * Source unique, sans dépendance, parce que deux consommateurs doivent rester
 * alignés et qu'ils ne peuvent pas s'importer l'un l'autre :
 *
 * - `sanitize-server.ts` (serveur seulement : il charge JSDOM) assainit ces
 *   champs à l'écriture et à la lecture ;
 * - `rex-detail-sections.ts` (chargé par le navigateur) décrit lesquels la fiche
 *   injecte en HTML.
 *
 * Un champ affiché en HTML sans être assaini serait une injection stockée ; un
 * champ saisi sans être affiché est une rubrique que le validateur ne voit pas.
 * `rex-detail-sections.test.ts` vérifie les deux.
 *
 * `localisation` et `commune` n'y figurent pas : ce sont des champs de saisie
 * simple, échappés par React à l'affichage comme l'est `title`.
 */
export const REX_HTML_FIELDS = [
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
  // Rubriques 2, 4 et 6 du plan type RETEX (annexe E, migration 023).
  'objectifs',
  'donnees_sources',
  'methode_argumentation',
] as const;

export type RexHtmlField = (typeof REX_HTML_FIELDS)[number];
