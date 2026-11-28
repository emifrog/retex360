/**
 * @jest-environment node
 */
import {
  REX_DETAIL_LAYOUT,
  blocksToDisplay,
  isEmptyHtml,
  interventionPlace,
  interventionTime,
  focusEntries,
  validationShareNotice,
} from '@/lib/rex-detail-sections';
import { REX_HTML_FIELDS } from '@/lib/rex-rich-fields';
import { rexFormDefaults } from '@/lib/rex-form-data';

/**
 * La fiche d'un REX n'affichait que six des quatorze rubriques de texte riche
 * que le formulaire fait saisir : objectifs, message d'ambiance, SITAC, éléments
 * favorables et défavorables, données et sources, méthode et documentation
 * n'existaient que dans le PDF. Le validateur approuvait sans voir l'analyse.
 *
 * La fiche se construit désormais à partir de `REX_DETAIL_LAYOUT`. Ces tests
 * tiennent cette liste alignée sur les champs du formulaire, dans les deux sens.
 */
describe('Fiche REX — rubriques affichées', () => {
  const htmlFieldsDisplayed = REX_DETAIL_LAYOUT.flatMap((b) =>
    b.kind === 'html' ? [b.field] : []
  );

  it('affiche toutes les rubriques de texte riche du formulaire', () => {
    const missing = REX_HTML_FIELDS.filter((f) => !htmlFieldsDisplayed.includes(f));
    expect(missing).toEqual([]);
  });

  it("n'injecte en HTML que des champs assainis côté serveur", () => {
    // L'inverse est une règle de sécurité : la fiche injecte ces champs via
    // `dangerouslySetInnerHTML`. Un champ affiché ainsi sans figurer dans la
    // liste assainie serait une injection de HTML stockée.
    const unsanitized = htmlFieldsDisplayed.filter(
      (f) => !(REX_HTML_FIELDS as readonly string[]).includes(f)
    );
    expect(unsanitized).toEqual([]);
  });

  it("n'affiche aucune rubrique deux fois", () => {
    expect(new Set(htmlFieldsDisplayed).size).toBe(htmlFieldsDisplayed.length);
  });

  it('couvre aussi les rubriques structurées du formulaire', () => {
    const kinds = REX_DETAIL_LAYOUT.map((b) => b.kind);
    for (const kind of ['chronologie', 'focus', 'prescriptions', 'temoignages', 'ressources']) {
      expect(kinds).toContain(kind);
    }
  });

  it('toute rubrique de texte riche est un champ du formulaire', () => {
    const formFields = Object.keys(rexFormDefaults());
    expect(REX_HTML_FIELDS.filter((f) => !formFields.includes(f))).toEqual([]);
  });

  describe('blocksToDisplay', () => {
    it('écarte les rubriques vides, y compris un éditeur laissé vide', () => {
      const blocks = blocksToDisplay({
        description: '<p>Feu de parking souterrain.</p>',
        context: '<p></p>',
        sitac: null,
        objectifs: '   ',
      });
      expect(blocks.map((b) => (b.kind === 'html' ? b.field : b.kind))).toEqual(['description']);
    });

    it("rend les rubriques d'analyse que la fiche ignorait", () => {
      const blocks = blocksToDisplay({
        objectifs: '<p>Établir les causes du retard de reconnaissance.</p>',
        message_ambiance: '<p>Fumées denses à l’arrivée.</p>',
        sitac: '<p>Deux secteurs.</p>',
        elements_favorables: '<p>Colonnes sèches en état.</p>',
        elements_defavorables: '<p>Désenfumage hors service.</p>',
        donnees_sources: '<p>Main courante, entretiens.</p>',
        methode_argumentation: '<p>Arbre des causes.</p>',
        documentation_operationnelle: '<p>GDO parcs de stationnement couverts.</p>',
      });
      expect(blocks.map((b) => (b.kind === 'html' ? b.field : b.kind))).toEqual([
        'objectifs',
        'message_ambiance',
        'sitac',
        'donnees_sources',
        'methode_argumentation',
        'elements_favorables',
        'elements_defavorables',
        'documentation_operationnelle',
      ]);
    });

    it('garde les rubriques structurées non vides, dans leur ordre', () => {
      const blocks = blocksToDisplay({
        chronologie: [{ id: '1' }],
        focus_thematiques: [{ id: 'f' }],
        prescriptions: [],
        temoignages: null,
        ressources_complementaires: [{ id: 'r' }],
      });
      expect(blocks.map((b) => b.kind)).toEqual(['chronologie', 'focus', 'ressources']);
    });
  });

  describe('isEmptyHtml', () => {
    it.each([
      null,
      undefined,
      '',
      '   ',
      '<p></p>',
      '<p><br></p>',
      '<p>&nbsp;</p>',
      '<ul><li></li></ul>',
    ])('tient %p pour vide', (value) => {
      expect(isEmptyHtml(value)).toBe(true);
    });

    it('tient un texte pour non vide', () => {
      expect(isEmptyHtml('<p>Texte</p>')).toBe(false);
      expect(isEmptyHtml('Texte simple')).toBe(false);
    });
  });
});

describe('Fiche REX — lieu et heure', () => {
  it('réunit le lieu et la commune', () => {
    expect(interventionPlace({ localisation: 'Parking Nice Étoile', commune: 'Nice' })).toBe(
      'Parking Nice Étoile, Nice'
    );
  });

  it("n'affiche que ce qui est renseigné", () => {
    expect(interventionPlace({ localisation: null, commune: 'Nice' })).toBe('Nice');
    expect(interventionPlace({ localisation: ' Tunnel de Toulon ', commune: '' })).toBe(
      'Tunnel de Toulon'
    );
    expect(interventionPlace({ localisation: null, commune: null })).toBeNull();
    expect(interventionPlace({})).toBeNull();
  });

  it('ne répète pas la commune déjà écrite dans le lieu', () => {
    expect(interventionPlace({ localisation: '30 av. Jean Médecin, Nice', commune: 'Nice' })).toBe(
      '30 av. Jean Médecin, Nice'
    );
  });

  it("met l'heure au format français, quelle que soit la forme rendue par la base", () => {
    expect(interventionTime('14:30:00')).toBe('14 h 30');
    expect(interventionTime('07:05')).toBe('7 h 05');
    expect(interventionTime('00:00:00')).toBe('0 h 00');
  });

  it("ne rend rien quand l'heure est absente ou illisible", () => {
    expect(interventionTime(null)).toBeNull();
    expect(interventionTime('')).toBeNull();
    expect(interventionTime('midi')).toBeNull();
  });
});

describe('Focus thématiques — contenu affiché', () => {
  it("rend les trois rubriques que l'éditeur fait saisir", () => {
    // L'éditeur enregistre `problematique`, `actions_menees` et
    // `axes_amelioration`. Le PDF ne lisait que les quatre champs de l'annexe F
    // (`constats`…), que personne ne peut saisir : un focus n'y montrait que son
    // titre.
    expect(
      focusEntries({
        id: '1',
        theme: 'Alimentation en eau',
        problematique: 'Débit insuffisant au poteau.',
        actions_menees: 'Mise en aspiration.',
        axes_amelioration: 'Recenser les points d’eau.',
      })
    ).toEqual([
      { key: 'problematique', label: 'Problématique', text: 'Débit insuffisant au poteau.' },
      { key: 'actions_menees', label: 'Actions menées', text: 'Mise en aspiration.' },
      {
        key: 'axes_amelioration',
        label: "Axes d'amélioration",
        text: 'Recenser les points d’eau.',
      },
    ]);
  });

  it("rend aussi les champs de l'annexe F quand ils existent, et saute les vides", () => {
    const entries = focusEntries({
      id: '1',
      theme: 'Commandement',
      problematique: '',
      actions_menees: '  ',
      axes_amelioration: 'Former les chefs de groupe.',
      constats: 'PC tardif.',
      propositions: 'Engager un PC de colonne dès le renfort.',
    });
    expect(entries.map((e) => e.key)).toEqual(['axes_amelioration', 'constats', 'propositions']);
  });
});

describe('Validation — rappel du partage', () => {
  it('prévient quand la validation ouvre le REX à tous les SDIS', () => {
    expect(validationShareNotice('inter_sdis')).toMatch(/tous les SDIS/);
    expect(validationShareNotice('public')).toMatch(/tous les SDIS/);
  });

  it('dit aussi quand le REX reste dans le SDIS', () => {
    expect(validationShareNotice('sdis')).toMatch(/restera réservé/);
  });

  it("traite une valeur inconnue comme le partage le plus large, pour ne pas l'occulter", () => {
    expect(validationShareNotice(undefined)).toMatch(/visibilité.*inconnue/i);
  });
});
