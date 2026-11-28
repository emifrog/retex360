/**
 * @jest-environment node
 */
import {
  rexFieldErrors,
  fieldErrorsFromServer,
  rexFieldHint,
  REX_FIELD_LABELS,
} from '@/lib/rex-form-errors';
import { getRequiredFieldsForType, validateRexByType } from '@/lib/validators/rex';

const focus = {
  id: 'f1',
  theme: 'Alimentation en eau',
  problematique: 'Débit insuffisant au poteau le plus proche.',
  actions_menees: 'Mise en aspiration dans le bassin.',
  axes_amelioration: 'Recenser les points d’eau du secteur.',
};

const texte = (n: number) => 'a'.repeat(n);

const complet = {
  signalement: {
    type_production: 'signalement',
    title: 'Feu de parking souterrain',
    intervention_date: '2026-03-12',
    type: 'Incendie urbain',
    severity: 'majeur',
    visibility: 'sdis',
    tags: [],
    description: texte(60),
  },
  pex: {
    type_production: 'pex',
    title: 'Feu de parking souterrain',
    intervention_date: '2026-03-12',
    type: 'Incendie urbain',
    severity: 'majeur',
    visibility: 'sdis',
    tags: [],
    description: texte(60),
    context: texte(30),
    means_deployed: texte(30),
    lessons_learned: texte(30),
  },
  retex: {
    type_production: 'retex',
    title: 'Feu de parking souterrain',
    intervention_date: '2026-03-12',
    type: 'Incendie urbain',
    severity: 'majeur',
    visibility: 'sdis',
    tags: [],
    description: texte(60),
    context: texte(30),
    means_deployed: texte(30),
    lessons_learned: texte(30),
    objectifs: texte(30),
    donnees_sources: texte(30),
    methode_argumentation: texte(30),
    focus_thematiques: [focus],
  },
} as const;

/**
 * Le formulaire n'affichait que « Données invalides », alors que l'API renvoie
 * le détail par champ. Un brouillon ne contenant qu'un titre était refusé sans
 * que rien ne dise ce qui manquait.
 */
describe('Formulaire REX — erreurs par champ', () => {
  it('les jeux de données de référence sont valides (garde-fou des tests suivants)', () => {
    // Le type d'intervention vient de la liste réelle : s'il en sortait, tous
    // les tests ci-dessous échoueraient pour une mauvaise raison.
    for (const data of Object.values(complet)) {
      expect(validateRexByType(data, false).success).toBe(true);
      expect(rexFieldErrors(data, 'pending')).toEqual({});
    }
  });

  describe('brouillon', () => {
    it('dit ce qui manque à un brouillon réduit à un titre', () => {
      const errors = rexFieldErrors({ type_production: 'retex', title: 'Feu de parking' }, 'draft');
      expect(Object.keys(errors).sort()).toEqual(['intervention_date', 'severity', 'type']);
      expect(errors.intervention_date).toBe(
        "La date d'intervention est requise, même pour un brouillon."
      );
      expect(errors.type).toBe("Le type d'intervention est requis, même pour un brouillon.");
      expect(errors.severity).toBe('Le niveau de criticité est requis, même pour un brouillon.');
    });

    it('signale un titre trop court par sa règle', () => {
      const errors = rexFieldErrors({ ...complet.retex, title: 'Feu' }, 'draft');
      expect(errors).toEqual({ title: 'Le titre doit contenir au moins 10 caractères' });
    });

    it('distingue un titre vide d’un titre trop court', () => {
      const errors = rexFieldErrors({ ...complet.retex, title: '' }, 'draft');
      expect(errors.title).toBe("L'intitulé est requis, même pour un brouillon.");
    });

    it("n'exige aucune rubrique de contenu", () => {
      const { title, intervention_date, type, severity } = complet.retex;
      expect(
        rexFieldErrors(
          { type_production: 'retex', title, intervention_date, type, severity },
          'draft'
        )
      ).toEqual({});
    });

    it('accepte un focus thématique en cours de rédaction', () => {
      // Le brouillon appliquait au focus les seuils de la soumission : un thème
      // choisi sans texte suffisait à faire refuser l'enregistrement.
      const errors = rexFieldErrors(
        {
          ...complet.retex,
          focus_thematiques: [{ ...focus, problematique: 'En cours', actions_menees: '' }],
        },
        'draft'
      );
      expect(errors).toEqual({});
    });
  });

  describe('soumission', () => {
    it('liste chaque rubrique requise absente, avec son message', () => {
      const errors = rexFieldErrors(
        { ...complet.retex, objectifs: '', lessons_learned: undefined, focus_thematiques: [] },
        'pending'
      );
      expect(errors).toEqual({
        objectifs: 'Les objectifs du RETEX sont requis pour soumettre.',
        lessons_learned: 'Les enseignements sont requis pour soumettre.',
        focus_thematiques: 'Au moins un focus thématique est requis pour un RETEX',
      });
    });

    it('garde le message de seuil quand la rubrique est commencée', () => {
      const errors = rexFieldErrors({ ...complet.pex, context: 'Trop court' }, 'pending');
      expect(errors).toEqual({
        context: 'Le contexte opérationnel doit contenir au moins 20 caractères',
      });
    });

    it('tient un éditeur laissé vide pour une rubrique absente', () => {
      // Tiptap enregistre « <p></p> » pour un éditeur vide.
      const errors = rexFieldErrors({ ...complet.pex, context: '<p></p>' }, 'pending');
      expect(errors.context).toBe('Le contexte opérationnel est requis pour soumettre.');
    });

    it('situe une erreur dans un focus thématique', () => {
      const errors = rexFieldErrors(
        {
          ...complet.retex,
          focus_thematiques: [focus, { ...focus, id: 'f2', problematique: 'Court' }],
        },
        'pending'
      );
      expect(errors).toEqual({
        focus_thematiques: 'Focus n° 2 : La problématique doit contenir au moins 10 caractères',
      });
    });

    it("n'exige pas d'un signalement les rubriques d'un RETEX", () => {
      expect(rexFieldErrors(complet.signalement, 'pending')).toEqual({});
    });
  });

  it('chaque champ requis a un libellé pour le résumé des erreurs', () => {
    for (const type of ['signalement', 'pex', 'retex'] as const) {
      for (const field of getRequiredFieldsForType(type)) {
        expect(REX_FIELD_LABELS[field]).toBeTruthy();
      }
    }
  });
});

describe('Formulaire REX — erreurs renvoyées par le serveur', () => {
  it('garde le premier message de chaque champ', () => {
    expect(fieldErrorsFromServer({ title: ['Trop court', 'Autre'], context: ['Requis'] })).toEqual({
      title: 'Trop court',
      context: 'Requis',
    });
  });

  it('ignore ce qui ne ressemble pas à une liste de messages', () => {
    expect(fieldErrorsFromServer(null)).toEqual({});
    expect(fieldErrorsFromServer('erreur')).toEqual({});
    expect(fieldErrorsFromServer({ title: [], type: 'x', severity: [42] })).toEqual({});
  });
});

describe('Formulaire REX — seuils annoncés', () => {
  // Un seuil annoncé à l'utilisateur doit être celui que la validation
  // applique : sinon le formulaire promet une chose et l'API en refuse une autre.
  const cases: Array<['signalement' | 'pex' | 'retex', string]> = [
    ['signalement', 'title'],
    ['signalement', 'description'],
    ['pex', 'description'],
    ['pex', 'context'],
    ['pex', 'means_deployed'],
    ['pex', 'lessons_learned'],
    ['retex', 'description'],
    ['retex', 'objectifs'],
    ['retex', 'donnees_sources'],
    ['retex', 'methode_argumentation'],
  ];

  it.each(cases)('%s — %s : le seuil annoncé est le seuil appliqué', (type, field) => {
    const hint = rexFieldHint(field, type);
    expect(hint).toMatch(/^\d+ caractères minimum$/);
    const min = Number(hint!.split(' ')[0]);

    expect(rexFieldErrors({ ...complet[type], [field]: texte(min) }, 'pending')).toEqual({});
    expect(rexFieldErrors({ ...complet[type], [field]: texte(min - 1) }, 'pending')).toHaveProperty(
      field
    );
  });

  it("n'annonce rien pour un champ sans seuil", () => {
    expect(rexFieldHint('difficulties', 'retex')).toBeNull();
    expect(rexFieldHint('context', 'signalement')).toBeNull();
  });
});
