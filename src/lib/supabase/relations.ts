/**
 * Normalisation des relations imbriquées de PostgREST.
 *
 * Pour une relation « to-one » (`comments.rex_id -> rex.id`), PostgREST renvoie
 * un OBJET. Mais sans types générés (`Database`), supabase-js ne connaît pas la
 * cardinalité de la relation et l'infère en TABLEAU. Le type et le runtime
 * divergent donc, et le compilateur ne peut pas trancher.
 *
 * Un cast (`as { … }`) ferait taire l'erreur en pariant sur une seule des deux
 * formes. Là où la valeur sert à une décision d'autorisation, se tromper de
 * forme donne `undefined` — soit un admin légitime refusé, soit, sur un test
 * écrit dans l'autre sens, un contrôle qui ne contrôle plus rien. On accepte
 * donc les deux formes explicitement.
 */
export function toOne<T>(embedded: T | T[] | null | undefined): T | null {
  if (embedded == null) return null;
  if (Array.isArray(embedded)) return embedded.length > 0 ? embedded[0] : null;
  return embedded;
}
