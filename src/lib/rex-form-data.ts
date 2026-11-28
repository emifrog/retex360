import type {
  ProductionType,
  FocusThematique,
  KeyFigures,
  TimelineEvent,
  Prescription,
  Temoignage,
  RessourceComplementaire,
} from '@/types';

/**
 * Données du formulaire REX, et passage d'une ligne de la base au formulaire.
 *
 * Ce module existe pour qu'il n'y ait qu'UNE liste des champs du formulaire.
 * Elle était auparavant écrite trois fois : le type, les valeurs par défaut du
 * formulaire, et la reprise d'un REX par la page d'édition. La troisième avait
 * neuf champs de retard. Le formulaire les initialisait donc à vide, et
 * l'enregistrement écrivait ce vide en base : rouvrir un REX pour corriger son
 * titre effaçait son lieu, ses témoignages et les trois rubriques du RETEX.
 */
export interface RexFormData {
  title: string;
  intervention_date: string;
  intervention_heure: string;
  localisation: string;
  commune: string;
  type: string;
  severity: string;
  visibility: string;
  type_production: ProductionType;
  description: string;
  context: string;
  means_deployed: string;
  difficulties: string;
  lessons_learned: string;
  message_ambiance: string;
  sitac: string;
  elements_favorables: string;
  elements_defavorables: string;
  documentation_operationnelle: string;
  objectifs: string;
  donnees_sources: string;
  methode_argumentation: string;
  focus_thematiques: FocusThematique[];
  key_figures: KeyFigures;
  chronologie: TimelineEvent[];
  prescriptions: Prescription[];
  temoignages: Temoignage[];
  description_site: string;
  ressources_complementaires: RessourceComplementaire[];
  tags: string[];
}

/** Valeurs initiales du formulaire : celles fournies, complétées par les valeurs vides. */
export function rexFormDefaults(initial?: Partial<RexFormData>): RexFormData {
  return {
    title: initial?.title || '',
    intervention_date: initial?.intervention_date || '',
    intervention_heure: initial?.intervention_heure || '',
    localisation: initial?.localisation || '',
    commune: initial?.commune || '',
    type: initial?.type || '',
    severity: initial?.severity || '',
    visibility: initial?.visibility || 'sdis',
    type_production: initial?.type_production || 'retex',
    description: initial?.description || '',
    context: initial?.context || '',
    means_deployed: initial?.means_deployed || '',
    difficulties: initial?.difficulties || '',
    lessons_learned: initial?.lessons_learned || '',
    message_ambiance: initial?.message_ambiance || '',
    sitac: initial?.sitac || '',
    elements_favorables: initial?.elements_favorables || '',
    elements_defavorables: initial?.elements_defavorables || '',
    documentation_operationnelle: initial?.documentation_operationnelle || '',
    objectifs: initial?.objectifs || '',
    donnees_sources: initial?.donnees_sources || '',
    methode_argumentation: initial?.methode_argumentation || '',
    focus_thematiques: initial?.focus_thematiques || [],
    key_figures: initial?.key_figures || {},
    chronologie: initial?.chronologie || [],
    prescriptions: initial?.prescriptions || [],
    temoignages: initial?.temoignages || [],
    description_site: initial?.description_site || '',
    ressources_complementaires: initial?.ressources_complementaires || [],
    tags: initial?.tags || [],
  };
}

/** Une ligne `rex` telle que la base la rend : mêmes champs, éventuellement NULL. */
export type RexRowForForm = { [K in keyof RexFormData]?: RexFormData[K] | null };

/**
 * Reprise d'un REX existant dans le formulaire.
 *
 * Dérivée de `rexFormDefaults` et non d'une liste de champs propre : un champ
 * ajouté au formulaire est repris d'office, sans qu'il faille penser à
 * l'inscrire ici. Les NULL de la base deviennent la valeur vide du champ.
 */
export function rexToFormData(rex: RexRowForForm): RexFormData {
  const present: Partial<Record<keyof RexFormData, unknown>> = {};
  for (const key of Object.keys(rexFormDefaults()) as (keyof RexFormData)[]) {
    const value = rex[key];
    if (value !== null && value !== undefined) present[key] = value;
  }
  return rexFormDefaults(present as Partial<RexFormData>);
}
