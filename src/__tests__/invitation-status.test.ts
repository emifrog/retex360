import { readInvitationCheck } from '@/lib/invitation-status';

/**
 * Lecture de la réponse de `GET /api/auth/invitation`.
 *
 * La page d'inscription ne regardait que le corps. Une réponse 429 — limiteur
 * de débit en panne ou plafond atteint par un centre de secours entier derrière
 * la même adresse — n'a pas de champ `valid` : elle était donc affichée comme
 * « lien invalide, déjà utilisé ou expiré », alors que l'invitation était bonne.
 */
describe('readInvitationCheck', () => {
  const invitation = {
    valid: true,
    email: 'agent@sdis06.fr',
    role: 'user',
    sdis: { code: '06', name: 'SDIS des Alpes-Maritimes' },
  };

  it('reconnaît une invitation valide', () => {
    expect(readInvitationCheck(200, invitation)).toEqual({
      state: 'valid',
      email: 'agent@sdis06.fr',
      role: 'user',
      sdis: { code: '06', name: 'SDIS des Alpes-Maritimes' },
    });
  });

  it('reconnaît une invitation refusée par le serveur', () => {
    expect(readInvitationCheck(200, { valid: false })).toEqual({ state: 'invalid' });
  });

  it('ne confond pas un 429 avec une invitation invalide', () => {
    expect(
      readInvitationCheck(429, { error: 'Trop de requêtes. Veuillez réessayer plus tard.' })
    ).toEqual({ state: 'unavailable' });
  });

  it('ne confond pas une erreur serveur avec une invitation invalide', () => {
    expect(readInvitationCheck(500, { error: 'Erreur serveur' })).toEqual({ state: 'unavailable' });
  });

  it('traite un corps inattendu comme une indisponibilité, pas comme un refus', () => {
    expect(readInvitationCheck(200, null)).toEqual({ state: 'unavailable' });
    expect(readInvitationCheck(200, { valid: true })).toEqual({ state: 'unavailable' });
  });
});
