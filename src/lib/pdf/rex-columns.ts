/**
 * Colonnes de `rex` que le document PDF affiche.
 *
 * Source unique partagée par le template (`rex-template.tsx`, qui les rend) et
 * la route d'export (`api/rex/[id]/pdf/route.ts`, qui les charge). Les deux
 * avaient divergé : `temoignages`, `description_site`,
 * `ressources_complementaires` et `numero_rex` étaient rendus par le template
 * mais absents du SELECT. Rien ne cassait — les rubriques sortaient simplement
 * vides, et la conversion de type forcée de la route empêchait TypeScript de
 * signaler l'écart.
 *
 * Module séparé du template parce que celui-ci importe `@react-pdf/renderer`,
 * publié en ESM : l'importer depuis un test le ferait échouer au chargement.
 * `pdf-template-columns.test.ts` relit donc le template et vérifie que tout
 * `rex.x` effectivement lu y figure, dans les deux sens.
 *
 * Ne contient PAS les jointures `author` / `sdis`, ni les colonnes propres à la
 * route (`id`, `slug`, `updated_at` pour le nom de fichier et l'ETag).
 */
export const REX_PDF_COLUMNS = [
  'title',
  'description',
  'context',
  'means_deployed',
  'difficulties',
  'lessons_learned',
  'type',
  'severity',
  'intervention_date',
  'intervention_heure',
  'localisation',
  'commune',
  'tags',
  'type_production',
  'focus_thematiques',
  'key_figures',
  'chronologie',
  'prescriptions',
  'temoignages',
  'ressources_complementaires',
  'description_site',
  'numero_rex',
  'message_ambiance',
  'sitac',
  'elements_favorables',
  'elements_defavorables',
  'documentation_operationnelle',
  'objectifs',
  'donnees_sources',
  'methode_argumentation',
] as const;
