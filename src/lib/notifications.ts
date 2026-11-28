import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { submissionNotifications } from '@/lib/rex-submission';

/**
 * Avertit les validateurs et les admins du SDIS qu'un REX attend leur décision.
 *
 * Aucune route ne le faisait : la file d'attente ne se découvrait que par le
 * badge du menu. Ce module contenait bien des fonctions de notification, mais
 * aucune n'était appelée — et elles écrivaient avec le client de l'utilisateur,
 * à qui la base interdit de créer une notification pour un autre (migration
 * 015). Elles ont été retirées.
 *
 * Client de service, pour deux raisons : lire les profils du SDIS avec leur
 * rôle, et écrire une notification destinée à autrui. L'appelant a déjà établi
 * que l'auteur vient de soumettre CE REX, dans SON SDIS.
 *
 * Ne lève jamais : un REX soumis reste soumis même si l'avertissement échoue.
 * L'échec est journalisé.
 */
export async function notifyValidatorsOfSubmission(args: {
  rexId: string;
  title: string;
  sdisId: string;
  authorId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, role, full_name, grade')
      .eq('sdis_id', args.sdisId);

    if (profilesError) {
      logger.error('Soumission : lecture des validateurs impossible', profilesError);
      return;
    }

    const author = (profiles ?? []).find((p) => p.id === args.authorId);
    const authorName = author
      ? [author.grade, author.full_name].filter(Boolean).join(' ') || null
      : null;

    const rows = submissionNotifications({
      rexId: args.rexId,
      title: args.title,
      authorId: args.authorId,
      authorName,
      recipients: profiles ?? [],
    });

    if (rows.length === 0) {
      // Un REX soumis que personne ne peut valider : à voir dans les journaux.
      logger.warn('Soumission sans validateur à avertir', {
        rexId: args.rexId,
        sdisId: args.sdisId,
      });
      return;
    }

    const { error } = await admin.from('notifications').insert(rows);
    if (error) {
      logger.error('Soumission : notifications non créées', error);
    }
  } catch (error) {
    logger.error('Soumission : notification des validateurs en échec', error);
  }
}
