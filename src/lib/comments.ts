/**
 * Règles des commentaires, sans dépendance : texte enregistré, fils de
 * discussion, mentions, modération. Partagé par les routes et les composants.
 */

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

/**
 * Texte d'un commentaire tel qu'il est enregistré : ce que l'utilisateur a
 * saisi, sans caractères de contrôle.
 *
 * Un commentaire est du TEXTE, pas du HTML. Il passait pourtant par un
 * assainisseur HTML, avec deux effets :
 *  - « < », « > » et « & » étaient enregistrés en entités, puis affichés tels
 *    quels (« Pression &lt; 8 bar ») ;
 *  - un passage entre « < » et « > » était pris pour une balise et supprimé
 *    (« si P<Pmin et T>Tmax » devenait « si PTmax »).
 *
 * La protection se fait là où elle doit l'être : à l'affichage. React échappe
 * le texte qu'il rend, et tout autre consommateur (courriel, export) doit en
 * faire autant — ce qu'il devait déjà faire pour le titre d'un REX.
 */
export function normalizeCommentText(input: string): string {
  return (
    input
      .replace(/\r\n?/g, '\n')
      // Caractères de contrôle, sauf saut de ligne (\n) et tabulation (\t).
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
      .trim()
  );
}

// ---------------------------------------------------------------------------
// Fils de discussion
// ---------------------------------------------------------------------------

interface ThreadableComment {
  id: string;
  parent_id?: string | null;
  created_at: string;
}

export type CommentThread<T> = T & { replies: T[] };

const byDate = (a: ThreadableComment, b: ThreadableComment) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

/**
 * Regroupe une liste à plat en fils : un commentaire de premier niveau et
 * toutes ses réponses, quelle que soit leur profondeur.
 *
 * Seules les réponses directes étaient rattachées. Or le bouton « Répondre »
 * existe aussi sur une réponse : la réponse à une réponse était enregistrée,
 * puis n'apparaissait nulle part.
 *
 * Un commentaire dont le parent est absent de la liste (supprimé, ou filtré par
 * les droits) ouvre son propre fil plutôt que de disparaître.
 */
export function buildCommentThreads<T extends ThreadableComment>(
  comments: readonly T[]
): CommentThread<T>[] {
  const byId = new Map(comments.map((c) => [c.id, c]));

  const rootOf = (comment: T): T => {
    const seen = new Set<string>([comment.id]);
    let current = comment;
    while (current.parent_id) {
      const parent = byId.get(current.parent_id);
      // Parent absent : le dernier commentaire trouvé ouvre le fil.
      if (!parent) break;
      // Boucle (impossible avec la clé étrangère, mais on ne tourne pas en rond
      // sur des données abîmées) : le commentaire ouvre son propre fil.
      if (seen.has(parent.id)) return comment;
      seen.add(parent.id);
      current = parent;
    }
    return current;
  };

  const threads = new Map<string, CommentThread<T>>();
  for (const comment of comments) {
    const root = rootOf(comment);
    if (!threads.has(root.id)) threads.set(root.id, { ...root, replies: [] });
  }
  for (const comment of comments) {
    const root = rootOf(comment);
    if (root.id !== comment.id) threads.get(root.id)!.replies.push(comment);
  }

  const result = [...threads.values()];
  for (const thread of result) thread.replies.sort(byDate);
  // Fils du plus récent au plus ancien ; réponses dans l'ordre de la discussion.
  return result.sort((a, b) => byDate(b, a));
}

/** Ajoute une réponse au fil qui contient `parentId`, sans modifier l'entrée. */
export function appendReply<T extends ThreadableComment>(
  threads: readonly CommentThread<T>[],
  parentId: string,
  reply: T
): CommentThread<T>[] {
  return threads.map((thread) =>
    thread.id === parentId || thread.replies.some((r) => r.id === parentId)
      ? { ...thread, replies: [...thread.replies, reply] }
      : thread
  );
}

/** Nombre total de commentaires, réponses comprises. */
export function countComments(threads: readonly { replies?: readonly unknown[] }[]): number {
  return threads.reduce((total, thread) => total + 1 + (thread.replies?.length ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Mentions
// ---------------------------------------------------------------------------
//
// Une mention s'écrit « @Prénom_Nom » : le tiret bas tient lieu d'espace.
// Les motifs utilisaient `\w`, qui ne connaît que l'ASCII : « @Jérôme »
// s'arrêtait à « J », et « Jean-Pierre » à « Jean ».

/** Caractères d'un nom : lettres de toute écriture, chiffres, tiret, apostrophes. */
const NAME_CHAR = "[\\p{L}\\p{N}'’-]";
/** L'arobase d'une mention ouvre un mot : elle n'est pas précédée d'une lettre (adresse de courriel). */
const NOT_AFTER_WORD = '(?<![\\p{L}\\p{N}_.])';

const MENTION_BEFORE_CURSOR = new RegExp(`${NOT_AFTER_WORD}@(${NAME_CHAR}*)$`, 'u');
const MENTION_IN_TEXT = new RegExp(`${NOT_AFTER_WORD}@((?:${NAME_CHAR}|_)+)`, 'gu');

/**
 * Mention en cours de saisie juste avant le curseur, ou `null`.
 * `token` est le texte à remplacer quand l'utilisateur choisit une personne.
 */
export function mentionQueryAt(textBeforeCursor: string): { query: string; token: string } | null {
  const match = MENTION_BEFORE_CURSOR.exec(textBeforeCursor);
  return match ? { query: match[1], token: match[0] } : null;
}

/** Forme écrite d'une mention pour un nom complet. */
export function mentionToken(fullName: string): string {
  return `@${fullName.trim().replace(/\s+/g, '_')}`;
}

const tokenToName = (token: string) => token.replace(/_/g, ' ').trim();

/**
 * Identifiants des personnes mentionnées dans `text`, d'après les mentions
 * insérées depuis la liste proposée (`known` : nom complet → identifiant).
 */
export function extractMentionIds(text: string, known: ReadonlyMap<string, string>): string[] {
  const ids: string[] = [];
  for (const match of text.matchAll(MENTION_IN_TEXT)) {
    let name = tokenToName(match[1]);
    // « @Jean_Dupont- » ou « @Jean_Dupont' » : la ponctuation collée n'est pas le nom.
    while (name && !known.has(name) && /['’_ -]$/.test(name)) name = name.slice(0, -1);
    const id = known.get(name);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export type MentionPart = { kind: 'text' | 'mention'; text: string };

/** Découpe un commentaire en texte et mentions, pour l'affichage. */
export function splitMentions(content: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of content.matchAll(MENTION_IN_TEXT)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: 'text', text: content.slice(last, start) });
    parts.push({ kind: 'mention', text: `@${tokenToName(match[1])}` });
    last = start + match[0].length;
  }
  if (last < content.length) parts.push({ kind: 'text', text: content.slice(last) });
  return parts;
}

// ---------------------------------------------------------------------------
// Modération
// ---------------------------------------------------------------------------

/**
 * Qui peut supprimer le commentaire d'un autre : l'admin du SDIS du REX, ou un
 * super-administrateur. Miroir de la policy DELETE (migration 021) et du
 * contrôle de la route — l'écran ne montrait le bouton qu'à l'auteur.
 */
export function canModerateComments(
  viewer: { role: string; sdis_id?: string | null } | null | undefined,
  rexSdisId: string | null | undefined
): boolean {
  if (!viewer) return false;
  if (viewer.role === 'super_admin') return true;
  return viewer.role === 'admin' && Boolean(rexSdisId) && viewer.sdis_id === rexSdisId;
}
