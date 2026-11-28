/**
 * @jest-environment node
 */
import {
  draftKey,
  saveLocalDraft,
  readLocalDraft,
  clearLocalDraft,
  clearAllLocalDrafts,
  hasUnsavedChanges,
  DRAFT_TTL_MS,
} from '@/lib/rex-draft-storage';
import { rexFormDefaults } from '@/lib/rex-form-data';

/** `Storage` minimal, avec un quota pour simuler un navigateur plein. */
class FakeStorage {
  private map = new Map<string, string>();
  quota = Infinity;
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (v.length > this.quota) throw new Error('QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

const NOW = Date.parse('2026-11-28T10:00:00Z');
const saisie = rexFormDefaults({ title: 'Feu de parking souterrain', description: '<p>Début</p>' });

/**
 * Le formulaire n'avait ni sauvegarde automatique ni alerte de sortie : un
 * onglet fermé ou une session expirée, et la saisie d'un RETEX était perdue.
 */
describe('Brouillon conservé sur l’appareil', () => {
  let storage: FakeStorage;
  beforeEach(() => {
    storage = new FakeStorage();
  });

  describe('clé', () => {
    it('est propre à l’utilisateur et au REX', () => {
      // Postes partagés en centre de secours : la saisie d'un agent ne doit pas
      // être proposée au suivant.
      expect(draftKey('agent-a', null)).not.toBe(draftKey('agent-b', null));
      expect(draftKey('agent-a', 'rex-1')).not.toBe(draftKey('agent-a', 'rex-2'));
      expect(draftKey('agent-a', null)).not.toBe(draftKey('agent-a', 'rex-1'));
    });
  });

  it('rend la saisie enregistrée, avec son heure', () => {
    const key = draftKey('agent-a', null);
    expect(saveLocalDraft(storage, key, saisie, NOW)).toBe(true);
    expect(readLocalDraft(storage, key, NOW + 60_000)).toEqual({ savedAt: NOW, data: saisie });
  });

  it('ne rend rien à un autre utilisateur', () => {
    saveLocalDraft(storage, draftKey('agent-a', null), saisie, NOW);
    expect(readLocalDraft(storage, draftKey('agent-b', null), NOW)).toBeNull();
  });

  it('oublie une saisie trop ancienne, et la retire', () => {
    const key = draftKey('agent-a', null);
    saveLocalDraft(storage, key, saisie, NOW);
    expect(readLocalDraft(storage, key, NOW + DRAFT_TTL_MS + 1)).toBeNull();
    expect(storage.getItem(key)).toBeNull();
  });

  it('ignore et retire un contenu illisible', () => {
    const key = draftKey('agent-a', null);
    storage.setItem(key, '{pas du json');
    expect(readLocalDraft(storage, key, NOW)).toBeNull();
    expect(storage.getItem(key)).toBeNull();

    storage.setItem(key, JSON.stringify({ v: 1, savedAt: 'hier', data: 'texte' }));
    expect(readLocalDraft(storage, key, NOW)).toBeNull();
  });

  it('complète une saisie ancienne avec les champs ajoutés depuis', () => {
    // Un champ ajouté au formulaire après l'enregistrement ne doit pas arriver
    // `undefined` dans le formulaire.
    const key = draftKey('agent-a', null);
    storage.setItem(
      key,
      JSON.stringify({ v: 1, savedAt: NOW, data: { title: 'Ancienne saisie' } })
    );
    const draft = readLocalDraft(storage, key, NOW);
    expect(draft?.data).toEqual(rexFormDefaults({ title: 'Ancienne saisie' }));
  });

  it("ne lève pas quand le navigateur refuse d'écrire", () => {
    storage.quota = 10;
    expect(saveLocalDraft(storage, draftKey('agent-a', null), saisie, NOW)).toBe(false);
  });

  it('ne lève pas sans stockage disponible', () => {
    expect(saveLocalDraft(null, 'k', saisie, NOW)).toBe(false);
    expect(readLocalDraft(null, 'k', NOW)).toBeNull();
    expect(() => clearLocalDraft(null, 'k')).not.toThrow();
    expect(() => clearAllLocalDrafts(null)).not.toThrow();
  });

  it('efface une saisie une fois enregistrée sur le serveur', () => {
    const key = draftKey('agent-a', 'rex-1');
    saveLocalDraft(storage, key, saisie, NOW);
    clearLocalDraft(storage, key);
    expect(readLocalDraft(storage, key, NOW)).toBeNull();
  });

  it('efface toutes les saisies à la déconnexion, sans toucher au reste', () => {
    saveLocalDraft(storage, draftKey('agent-a', null), saisie, NOW);
    saveLocalDraft(storage, draftKey('agent-a', 'rex-1'), saisie, NOW);
    storage.setItem('theme', 'dark');

    clearAllLocalDrafts(storage);

    expect(storage.length).toBe(1);
    expect(storage.getItem('theme')).toBe('dark');
  });
});

describe('Modifications non enregistrées', () => {
  const base = rexFormDefaults({ title: 'Feu de parking souterrain' });

  it('aucune quand rien n’a changé', () => {
    expect(hasUnsavedChanges(base, { ...base })).toBe(false);
  });

  it('dès qu’un champ change', () => {
    expect(hasUnsavedChanges(base, { ...base, commune: 'Nice' })).toBe(true);
    expect(hasUnsavedChanges(base, { ...base, tags: ['parking'] })).toBe(true);
  });

  it("un éditeur ouvert puis laissé vide n'est pas une modification", () => {
    // Tiptap écrit « <p></p> » dès qu'on clique dans un éditeur vide.
    expect(hasUnsavedChanges(base, { ...base, context: '<p></p>' })).toBe(false);
  });

  it("l'ordre des clés ne compte pas", () => {
    const reordered = Object.fromEntries(Object.entries(base).reverse()) as typeof base;
    expect(hasUnsavedChanges(base, reordered)).toBe(false);
  });
});
