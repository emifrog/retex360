/**
 * @jest-environment node
 */
import { isSubmission, submissionNotifications } from '@/lib/rex-submission';

/**
 * Aucune route ne prévenait les validateurs d'une soumission : la file d'attente
 * ne se découvrait que par le badge du menu.
 */
describe('Soumission — reconnaître le moment où un REX part en validation', () => {
  it('création directement « en attente »', () => {
    expect(isSubmission(null, 'pending')).toBe(true);
    expect(isSubmission(undefined, 'pending')).toBe(true);
  });

  it('brouillon soumis, y compris après un rejet', () => {
    expect(isSubmission('draft', 'pending')).toBe(true);
  });

  it('pas une soumission : enregistrer un brouillon, ou corriger un REX déjà en attente', () => {
    expect(isSubmission(null, 'draft')).toBe(false);
    expect(isSubmission('draft', 'draft')).toBe(false);
    // Un admin qui corrige un REX en attente ne relance pas les validateurs.
    expect(isSubmission('pending', 'pending')).toBe(false);
    expect(isSubmission('validated', 'validated')).toBe(false);
  });

  it("pas une soumission quand le statut n'est pas modifié", () => {
    expect(isSubmission('draft', null)).toBe(false);
    expect(isSubmission('draft', undefined)).toBe(false);
  });
});

describe('Soumission — notifications aux validateurs', () => {
  const base = {
    rexId: 'rex-1',
    title: 'Feu de parking souterrain',
    authorId: 'auteur',
    authorName: 'Cne Martin',
  };

  it('prévient les validateurs et les admins du SDIS', () => {
    const rows = submissionNotifications({
      ...base,
      recipients: [
        { id: 'validateur', role: 'validator' },
        { id: 'admin', role: 'admin' },
      ],
    });
    expect(rows.map((r) => r.user_id)).toEqual(['validateur', 'admin']);
    expect(rows[0]).toEqual({
      user_id: 'validateur',
      type: 'new_rex',
      title: 'REX à valider',
      content: 'Cne Martin a soumis « Feu de parking souterrain ».',
      link: '/rex/rex-1',
      rex_id: 'rex-1',
    });
  });

  it("ne prévient pas l'auteur de sa propre soumission", () => {
    // Un validateur qui soumet son REX n'a pas à s'en avertir lui-même.
    const rows = submissionNotifications({
      ...base,
      recipients: [
        { id: 'auteur', role: 'validator' },
        { id: 'autre', role: 'validator' },
      ],
    });
    expect(rows.map((r) => r.user_id)).toEqual(['autre']);
  });

  it('ignore les rôles qui ne valident pas, et les doublons', () => {
    const rows = submissionNotifications({
      ...base,
      recipients: [
        { id: 'agent', role: 'user' },
        { id: 'validateur', role: 'validator' },
        { id: 'validateur', role: 'validator' },
      ],
    });
    expect(rows.map((r) => r.user_id)).toEqual(['validateur']);
  });

  it("se passe du nom de l'auteur quand il est inconnu", () => {
    const [row] = submissionNotifications({
      ...base,
      authorName: null,
      recipients: [{ id: 'validateur', role: 'validator' }],
    });
    expect(row.content).toBe('« Feu de parking souterrain » a été soumis pour validation.');
  });

  it('abrège un titre très long', () => {
    const [row] = submissionNotifications({
      ...base,
      title: 'T'.repeat(400),
      recipients: [{ id: 'validateur', role: 'validator' }],
    });
    expect(row.content.length).toBeLessThan(220);
    expect(row.content).toContain('…');
  });
});
