/**
 * Soumission d'un REX : quand elle a lieu, et qui en est averti.
 *
 * Sans dépendance, pour être testé seul. L'écriture en base est dans
 * `notifications.ts`.
 */

/**
 * Vrai quand une écriture fait ENTRER le REX dans la file de validation.
 *
 * `previous` : statut avant l'écriture (`null` à la création).
 * `next` : statut demandé (`null` quand l'écriture n'y touche pas).
 */
export function isSubmission(
  previous: string | null | undefined,
  next: string | null | undefined
): boolean {
  return next === 'pending' && previous !== 'pending';
}

/** Rôles avertis d'une soumission : ceux qui valident pour leur SDIS. */
const NOTIFIED_ROLES = ['validator', 'admin'];

const MAX_TITLE_LENGTH = 160;

export interface SubmissionNotification {
  user_id: string;
  type: 'new_rex';
  title: string;
  content: string;
  link: string;
  rex_id: string;
}

/**
 * Notifications à créer pour une soumission.
 *
 * `recipients` : profils du SDIS du REX. Sont retenus les validateurs et les
 * admins, hors auteur. Le super-administrateur n'est pas averti : il suit tous
 * les SDIS depuis sa propre file, et recevrait chaque soumission de la
 * plateforme.
 *
 * `rex_id` est renseigné : la notification disparaît avec le REX (clé étrangère
 * en cascade), au lieu de mener à une page introuvable.
 */
export function submissionNotifications(args: {
  rexId: string;
  title: string;
  authorId: string;
  authorName?: string | null;
  recipients: readonly { id: string; role: string }[];
}): SubmissionNotification[] {
  const title =
    args.title.length > MAX_TITLE_LENGTH
      ? `${args.title.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
      : args.title;
  const content = args.authorName
    ? `${args.authorName} a soumis « ${title} ».`
    : `« ${title} » a été soumis pour validation.`;

  const ids = new Set<string>();
  for (const recipient of args.recipients) {
    if (recipient.id !== args.authorId && NOTIFIED_ROLES.includes(recipient.role)) {
      ids.add(recipient.id);
    }
  }

  return [...ids].map((user_id) => ({
    user_id,
    type: 'new_rex',
    title: 'REX à valider',
    content,
    link: `/rex/${args.rexId}`,
    rex_id: args.rexId,
  }));
}
