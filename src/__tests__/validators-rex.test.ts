/**
 * @jest-environment node
 *
 * `validateRexByType()` encode la doctrine DGSCGC (mémento de septembre 2022) :
 * un Signalement, un PEX et un RETEX ne demandent pas le même niveau de
 * renseignement. C'est donc cette fonction qui autorise ou refuse la promotion
 * Signalement → PEX → RETEX, et qui garde la porte du POST /api/rex.
 *
 * Elle est pure et prend une entrée non typée venue du client : exactement ce
 * qui se teste bien.
 */
import {
  validateRexByType,
  getRequiredFieldsForType,
  focusThematiqueSchema,
  rexFilterSchema,
} from '@/lib/validators/rex';
import { PRODUCTION_TYPES } from '@/types';

/** Socle commun à tous les niveaux de production. */
const base = {
  title: 'Feu de hangar agricole à Vallauris',
  intervention_date: '2026-03-14',
  type: 'Incendie urbain',
  severity: 'majeur',
};

const LONG = 'a'.repeat(60); // dépasse les seuils de 20 et 50 caractères
const MEDIUM = 'b'.repeat(25); // dépasse 20, pas 50

const focus = {
  id: 'f1',
  theme: 'Engagement',
  problematique: 'La reconnaissance initiale a manqué de coordination.',
  actions_menees: 'Binôme dédié à la reconnaissance dès le second engin.',
  axes_amelioration: 'Formaliser la reconnaissance dans la marche générale.',
};

const pexPayload = {
  ...base,
  type_production: 'pex',
  description: LONG,
  context: MEDIUM,
  means_deployed: MEDIUM,
  lessons_learned: MEDIUM,
};

/**
 * Rubriques 2, 4 et 6 du plan type RETEX (annexe E), ajoutées par la
 * migration 023. Un PEX complet promu en RETEX sans elles doit être refusé.
 */
const rubriquesRetex = {
  objectifs: 'Établir pourquoi la reconnaissance initiale a tardé de douze minutes.',
  donnees_sources:
    "Entretiens avec le COS et les chefs d'agrès, enregistrements radio, main courante.",
  methode_argumentation:
    'Analyse chronologique croisée avec les témoignages, méthode retenue pour recouper les perceptions.',
};

const retexPayload = {
  ...pexPayload,
  type_production: 'retex',
  focus_thematiques: [focus],
  ...rubriquesRetex,
};

/** Chemins de champs en erreur, pour assertions lisibles. */
function errorFields(result: ReturnType<typeof validateRexByType>): string[] {
  if (result.success) return [];
  return [...new Set(result.error.issues.map((i) => i.path.join('.')))];
}

describe('Brouillon — validation allégée', () => {
  it('accepte un REX à peine commencé, sans description', () => {
    const r = validateRexByType({ ...base }, true);
    expect(r.success).toBe(true);
  });

  it('accepte une description vide', () => {
    expect(validateRexByType({ ...base, description: '' }, true).success).toBe(true);
  });

  it('exige malgré tout un titre de 10 caractères', () => {
    // Le socle commun s'applique même au brouillon : l'allègement porte sur le
    // contenu rédactionnel, pas sur l'identification du REX.
    const r = validateRexByType({ ...base, title: 'Feu' }, true);
    expect(r.success).toBe(false);
    expect(errorFields(r)).toContain('title');
  });

  it('refuse une date d’intervention malformée', () => {
    const r = validateRexByType({ ...base, intervention_date: '14/03/2026' }, true);
    expect(errorFields(r)).toContain('intervention_date');
  });

  it('refuse un type d’intervention hors nomenclature', () => {
    const r = validateRexByType({ ...base, type: 'Sauvetage de chat' }, true);
    expect(errorFields(r)).toContain('type');
  });

  it('applique les valeurs par défaut : visibilité SDIS, RETEX, aucun tag', () => {
    const r = validateRexByType({ ...base }, true);
    expect(r.success && r.data).toMatchObject({
      visibility: 'sdis',
      type_production: 'retex',
      tags: [],
    });
  });
});

describe('Signalement — remontée rapide', () => {
  it('accepte une description courte mais réelle', () => {
    const r = validateRexByType({
      ...base,
      type_production: 'signalement',
      description: MEDIUM,
    });
    expect(r.success).toBe(true);
  });

  it('refuse une description de moins de 20 caractères', () => {
    const r = validateRexByType({
      ...base,
      type_production: 'signalement',
      description: 'RAS',
    });
    expect(errorFields(r)).toContain('description');
  });

  it('n’exige ni contexte, ni moyens, ni enseignements', () => {
    const r = validateRexByType({
      ...base,
      type_production: 'signalement',
      description: MEDIUM,
      context: null,
      means_deployed: null,
      lessons_learned: null,
    });
    expect(r.success).toBe(true);
  });
});

describe('PEX — synthèse factuelle', () => {
  it('accepte un dossier complet', () => {
    expect(validateRexByType(pexPayload).success).toBe(true);
  });

  it('exige une description plus étoffée que le signalement', () => {
    // 25 caractères suffisent en signalement, pas en PEX (seuil à 50).
    const r = validateRexByType({ ...pexPayload, description: MEDIUM });
    expect(errorFields(r)).toContain('description');
  });

  it('exige contexte, moyens engagés et enseignements', () => {
    const r = validateRexByType({
      ...base,
      type_production: 'pex',
      description: LONG,
    });
    expect(errorFields(r)).toEqual(
      expect.arrayContaining(['context', 'means_deployed', 'lessons_learned'])
    );
  });

  it('n’exige pas de focus thématique', () => {
    const r = validateRexByType({ ...pexPayload, focus_thematiques: [] });
    expect(r.success).toBe(true);
  });
});

describe('RETEX — dossier complet', () => {
  it('accepte un dossier complet', () => {
    expect(validateRexByType(retexPayload).success).toBe(true);
  });

  it('refuse un dossier sans aucun focus thématique', () => {
    // C'est LA différence entre un PEX et un RETEX : le même contenu, promu en
    // RETEX sans focus, doit être refusé.
    const r = validateRexByType({ ...pexPayload, type_production: 'retex' });
    expect(errorFields(r)).toContain('focus_thematiques');
  });

  it('refuse une liste de focus vide', () => {
    const r = validateRexByType({
      ...pexPayload,
      type_production: 'retex',
      focus_thematiques: [],
    });
    expect(errorFields(r)).toContain('focus_thematiques');
  });

  it('refuse un focus thématique bâclé', () => {
    const r = validateRexByType({
      ...pexPayload,
      type_production: 'retex',
      ...rubriquesRetex,
      focus_thematiques: [{ ...focus, problematique: 'RAS' }],
    });
    expect(errorFields(r)).toContain('focus_thematiques.0.problematique');
  });

  it('accepte un focus au seuil exact de 10 caractères', () => {
    // Borne du schéma : `.min(10)` est inclusif. Fixé par un test pour qu'un
    // resserrage du seuil soit un choix, pas une dérive.
    const r = validateRexByType({
      ...pexPayload,
      type_production: 'retex',
      ...rubriquesRetex,
      focus_thematiques: [{ ...focus, problematique: '0123456789' }],
    });
    expect(r.success).toBe(true);
  });

  it('refuse un focus sans thème', () => {
    const r = validateRexByType({
      ...pexPayload,
      type_production: 'retex',
      ...rubriquesRetex,
      focus_thematiques: [{ ...focus, theme: '' }],
    });
    expect(errorFields(r)).toContain('focus_thematiques.0.theme');
  });
});

describe('RETEX — rubriques du plan type (annexe E)', () => {
  it('exige les objectifs, les données/sources et la méthode', () => {
    // Rubriques 2, 4 et 6 : c'est ce qui sépare un RETEX d'un PEX étoffé.
    const r = validateRexByType({
      ...pexPayload,
      type_production: 'retex',
      focus_thematiques: [focus],
    });
    expect(errorFields(r)).toEqual(
      expect.arrayContaining(['objectifs', 'donnees_sources', 'methode_argumentation'])
    );
  });

  it('refuse une rubrique expédiée en trois mots', () => {
    const r = validateRexByType({ ...retexPayload, donnees_sources: 'RAS' });
    expect(errorFields(r)).toContain('donnees_sources');
  });

  it('ne les exige NI du PEX NI du signalement', () => {
    // Le mémento veut un PEX léger : les imposer contredirait la doctrine.
    expect(validateRexByType(pexPayload).success).toBe(true);
    expect(
      validateRexByType({ ...base, type_production: 'signalement', description: MEDIUM }).success
    ).toBe(true);
  });
});

describe('Lieu et heure — plan type PEX (annexe D)', () => {
  it('accepte un lieu et une heure', () => {
    const r = validateRexByType({
      ...pexPayload,
      intervention_heure: '14:32',
      localisation: 'Parking souterrain Nice Étoile, 30 av. Jean Médecin',
      commune: 'Nice',
    });
    expect(r.success).toBe(true);
  });

  it('les laisse facultatifs — une heure est souvent inconnue', () => {
    expect(validateRexByType(pexPayload).success).toBe(true);
  });

  it('accepte les secondes, refuse une heure impossible', () => {
    expect(validateRexByType({ ...pexPayload, intervention_heure: '23:59:59' }).success).toBe(true);
    expect(
      errorFields(validateRexByType({ ...pexPayload, intervention_heure: '25:00' }))
    ).toContain('intervention_heure');
    expect(
      errorFields(validateRexByType({ ...pexPayload, intervention_heure: '14h32' }))
    ).toContain('intervention_heure');
  });

  it('tolère une heure vide, que renvoie un formulaire non rempli', () => {
    expect(validateRexByType({ ...pexPayload, intervention_heure: '' }).success).toBe(true);
  });
});

describe('Niveau de production — discrimination', () => {
  it('refuse un niveau de production inconnu', () => {
    const r = validateRexByType({ ...pexPayload, type_production: 'note_de_service' });
    expect(r.success).toBe(false);
  });

  it('refuse une soumission sans niveau de production', () => {
    // Hors brouillon, l'union discriminée impose de déclarer le niveau : la
    // valeur par défaut du socle ne s'applique pas ici.
    const sansNiveau: Record<string, unknown> = { ...pexPayload };
    delete sansNiveau.type_production;
    expect(validateRexByType(sansNiveau).success).toBe(false);
  });

  it('applique bien un jeu de règles différent selon le niveau déclaré', () => {
    // Même charge utile, deux verdicts : c'est le cœur du workflow de promotion.
    const commun = { ...base, description: MEDIUM };
    expect(validateRexByType({ ...commun, type_production: 'signalement' }).success).toBe(true);
    expect(validateRexByType({ ...commun, type_production: 'pex' }).success).toBe(false);
  });
});

describe('focusThematiqueSchema — pris isolément', () => {
  it('accepte un focus renseigné', () => {
    expect(focusThematiqueSchema.safeParse(focus).success).toBe(true);
  });

  it('exige les trois volets : problématique, actions, axes', () => {
    const r = focusThematiqueSchema.safeParse({ id: 'f1', theme: 'Engagement' });
    expect(r.success).toBe(false);
    const champs = r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
    expect(champs).toEqual(
      expect.arrayContaining(['problematique', 'actions_menees', 'axes_amelioration'])
    );
  });
});

describe('rexFilterSchema — bornes de la recherche', () => {
  it('applique une pagination par défaut', () => {
    const r = rexFilterSchema.safeParse({});
    expect(r.success && r.data).toMatchObject({ page: 1, limit: 10 });
  });

  it('plafonne la taille de page à 50', () => {
    // Sans ce plafond, `?limit=100000` scanne la table entière.
    expect(rexFilterSchema.safeParse({ limit: 50 }).success).toBe(true);
    expect(rexFilterSchema.safeParse({ limit: 51 }).success).toBe(false);
  });

  it('refuse une page nulle ou négative', () => {
    expect(rexFilterSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(rexFilterSchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it('refuse un identifiant de SDIS qui n’est pas un UUID', () => {
    expect(rexFilterSchema.safeParse({ sdis_id: '06' }).success).toBe(false);
    expect(
      rexFilterSchema.safeParse({ sdis_id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' }).success
    ).toBe(true);
  });

  it('accepte un filtre complet', () => {
    const r = rexFilterSchema.safeParse({
      search: 'hangar',
      type: 'Incendie urbain',
      severity: 'majeur',
      status: 'validated',
      type_production: 'retex',
      date_from: '2026-01-01',
      date_to: '2026-12-31',
    });
    expect(r.success).toBe(true);
  });
});

describe('getRequiredFieldsForType', () => {
  it('énumère les champs requis, du plus léger au plus complet', () => {
    const signalement = getRequiredFieldsForType('signalement');
    const pex = getRequiredFieldsForType('pex');
    const retex = getRequiredFieldsForType('retex');

    // Chaque niveau contient strictement le précédent : c'est ce qui rend la
    // promotion progressive et l'indicateur de complétion cohérent.
    expect(pex).toEqual(expect.arrayContaining(signalement));
    expect(retex).toEqual(expect.arrayContaining(pex));
    expect(signalement.length).toBeLessThan(pex.length);
    expect(pex.length).toBeLessThan(retex.length);
  });

  it('réclame un focus thématique pour le seul RETEX', () => {
    expect(getRequiredFieldsForType('retex')).toContain('focus_thematiques');
    expect(getRequiredFieldsForType('pex')).not.toContain('focus_thematiques');
  });

  it('réclame les rubriques du plan type RETEX pour le seul RETEX', () => {
    // Cette liste pilote l'indicateur de complétion et le bouton de promotion :
    // si elle diverge des schémas Zod, l'interface annonce « complet » sur un
    // dossier que la validation refusera.
    const retex = getRequiredFieldsForType('retex');
    const pex = getRequiredFieldsForType('pex');
    for (const champ of ['objectifs', 'donnees_sources', 'methode_argumentation']) {
      expect(retex).toContain(champ);
      expect(pex).not.toContain(champ);
    }
  });

  it('retombe sur le socle minimal pour un type inattendu', () => {
    const inconnu = getRequiredFieldsForType('autre' as (typeof PRODUCTION_TYPES)[number]);
    expect(inconnu).toEqual(getRequiredFieldsForType('signalement'));
  });
});
