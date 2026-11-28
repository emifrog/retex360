/**
 * Lecture de la réponse de `GET /api/auth/invitation`.
 *
 * Trois issues, et non deux. « Le serveur dit que l'invitation n'est pas
 * valable » et « le serveur n'a pas pu répondre » ne demandent pas la même
 * chose à l'invité : dans le premier cas il doit redemander un lien, dans le
 * second il doit simplement réessayer. Les confondre a fait afficher « lien
 * invalide ou expiré » à des invités dont le lien était bon, pendant toute la
 * durée d'une panne du limiteur de débit.
 */
export type InvitationCheck =
  | {
      state: 'valid';
      email: string;
      role: string;
      sdis: { code: string; name: string } | null;
    }
  | { state: 'invalid' }
  | { state: 'unavailable' };

export function readInvitationCheck(status: number, body: unknown): InvitationCheck {
  if (status < 200 || status >= 300) return { state: 'unavailable' };
  if (typeof body !== 'object' || body === null) return { state: 'unavailable' };

  const data = body as {
    valid?: unknown;
    email?: unknown;
    role?: unknown;
    sdis?: { code: string; name: string } | null;
  };

  if (data.valid === false) return { state: 'invalid' };
  if (data.valid === true && typeof data.email === 'string' && typeof data.role === 'string') {
    return { state: 'valid', email: data.email, role: data.role, sdis: data.sdis ?? null };
  }
  return { state: 'unavailable' };
}
