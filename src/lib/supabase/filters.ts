/**
 * Helpers pour construire des expressions de filtre PostgREST à partir d'entrées
 * utilisateur.
 *
 * `.eq()`, `.ilike()`, etc. reçoivent la valeur en paramètre : supabase-js
 * l'encode, elle ne peut pas modifier la structure du filtre. `.or()` est
 * différent — son argument est une EXPRESSION parsée par PostgREST, où `,`
 * sépare les conditions, `.` sépare colonne / opérateur / valeur, et `()`
 * délimite les groupes. Interpoler une chaîne utilisateur dedans permet donc
 * d'injecter des conditions arbitraires :
 *
 *   .or(`title.ilike.%${q}%`)   avec q = "x,status.eq.draft"
 *   => or=(title.ilike.%x%,status.eq.draft%)
 *
 * PostgREST accepte des valeurs entre guillemets doubles pour neutraliser ces
 * caractères réservés ; à l'intérieur, `"` et `\` s'échappent par `\`.
 */

/** Échappe une valeur pour l'insérer dans une expression de filtre PostgREST. */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Construit l'argument de `.or()` pour une recherche `ilike` sur plusieurs
 * colonnes, avec la valeur correctement échappée.
 *
 *   orIlike(['title', 'description'], 'a,b')
 *   => 'title.ilike."%a,b%",description.ilike."%a,b%"'
 *
 * Note : `%` et `_` saisis par l'utilisateur restent des jokers LIKE (PostgREST
 * n'expose pas de clause ESCAPE). C'est sans impact sur la sécurité — au pire
 * la recherche est plus large — mais l'expression, elle, n'est plus détournable.
 */
export function orIlike(columns: string[], term: string): string {
  const pattern = quoteFilterValue(`%${term}%`);
  return columns.map((column) => `${column}.ilike.${pattern}`).join(',');
}

/** UUID v1-v5, tel qu'accepté par Postgres. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Garde pour les listes passées à `.in()` : comme `.or()`, une liste
 * `in.(a,b,c)` est parsée, donc une valeur contenant `,` ou `)` la détourne.
 * Les identifiants du projet étant tous des UUID, on filtre par la forme.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
