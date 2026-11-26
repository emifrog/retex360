import { canDeleteRex, rejectionReasonFor } from '@/lib/rex-permissions';

const SDIS_A = '11111111-1111-1111-1111-111111111111';
const SDIS_B = '22222222-2222-2222-2222-222222222222';
const AUTHOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const rex = (status: string, extra: Record<string, unknown> = {}) => ({
  author_id: AUTHOR,
  sdis_id: SDIS_A,
  status,
  ...extra,
});

/**
 * Miroir applicatif de la policy DELETE de `rex` (migration 026). L'interface
 * s'en sert pour ne pas proposer un bouton que la base refusera, et la route
 * pour répondre un message lisible plutôt qu'un 403 muet.
 */
describe('canDeleteRex', () => {
  const author = { id: AUTHOR, role: 'user', sdis_id: SDIS_A };

  it("l'auteur supprime son brouillon", () => {
    expect(canDeleteRex(author, rex('draft'))).toBe(true);
  });

  it("l'auteur supprime son REX en attente", () => {
    expect(canDeleteRex(author, rex('pending'))).toBe(true);
  });

  it("l'auteur ne supprime pas son REX validé", () => {
    expect(canDeleteRex(author, rex('validated'))).toBe(false);
  });

  it("l'admin du SDIS supprime un REX validé", () => {
    expect(canDeleteRex({ id: OTHER, role: 'admin', sdis_id: SDIS_A }, rex('validated'))).toBe(
      true
    );
  });

  it("l'admin d'un autre SDIS ne supprime pas", () => {
    expect(canDeleteRex({ id: OTHER, role: 'admin', sdis_id: SDIS_B }, rex('validated'))).toBe(
      false
    );
  });

  it('le super_admin supprime partout', () => {
    expect(canDeleteRex({ id: OTHER, role: 'super_admin', sdis_id: null }, rex('validated'))).toBe(
      true
    );
  });

  it('un validateur non auteur ne supprime pas', () => {
    expect(canDeleteRex({ id: OTHER, role: 'validator', sdis_id: SDIS_A }, rex('draft'))).toBe(
      false
    );
  });

  it('un visiteur sans profil ne supprime rien', () => {
    expect(canDeleteRex(null, rex('draft'))).toBe(false);
  });
});

/**
 * Le motif de rejet était enregistré mais lu par aucun écran : l'auteur ne le
 * voyait que tronqué, dans une notification.
 */
describe('rejectionReasonFor', () => {
  const author = { id: AUTHOR, role: 'user', sdis_id: SDIS_A };

  it("montre le motif à l'auteur d'un brouillon rejeté", () => {
    expect(
      rejectionReasonFor(author, rex('draft', { rejection_reason: 'Chronologie à compléter' }))
    ).toBe('Chronologie à compléter');
  });

  it('ne montre rien une fois le REX soumis de nouveau', () => {
    expect(
      rejectionReasonFor(author, rex('pending', { rejection_reason: 'Ancien motif' }))
    ).toBeNull();
  });

  it("ne montre rien à quelqu'un d'autre que l'auteur", () => {
    expect(
      rejectionReasonFor(
        { id: OTHER, role: 'admin', sdis_id: SDIS_A },
        rex('draft', { rejection_reason: 'Chronologie à compléter' })
      )
    ).toBeNull();
  });

  it('ne montre rien sans motif', () => {
    expect(rejectionReasonFor(author, rex('draft', { rejection_reason: null }))).toBeNull();
    expect(rejectionReasonFor(author, rex('draft', { rejection_reason: '   ' }))).toBeNull();
  });
});
