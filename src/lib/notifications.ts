import { createClient } from '@/lib/supabase/server';

export type NotificationType = 'mention' | 'comment' | 'validation' | 'new_rex' | 'rejection';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  link?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  content,
  link,
}: CreateNotificationParams) {
  const supabase = await createClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    content,
    link,
  });

  if (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }

  return { success: true };
}

/**
 * Notify user when their REX is validated
 */
export async function notifyRexValidated(rexId: string, rexTitle: string, authorId: string) {
  return createNotification({
    userId: authorId,
    type: 'validation',
    title: 'Votre RETEX a été validé',
    content: rexTitle,
    link: `/rex/${rexId}`,
  });
}

/**
 * Notify user when their REX is rejected
 */
export async function notifyRexRejected(rexId: string, rexTitle: string, authorId: string, reason?: string) {
  return createNotification({
    userId: authorId,
    type: 'rejection',
    title: 'Votre RETEX a été refusé',
    content: reason || rexTitle,
    link: `/rex/${rexId}`,
  });
}

/**
 * Notify user when someone comments on their REX
 */
export async function notifyNewComment(
  rexId: string,
  rexTitle: string,
  authorId: string,
  commenterName: string
) {
  return createNotification({
    userId: authorId,
    type: 'comment',
    title: `${commenterName} a commenté votre RETEX`,
    content: rexTitle,
    link: `/rex/${rexId}#comments`,
  });
}

/**
 * Notify user when they are mentioned in a comment
 */
export async function notifyMention(
  rexId: string,
  mentionedUserId: string,
  mentionerName: string,
  commentExcerpt: string
) {
  return createNotification({
    userId: mentionedUserId,
    type: 'mention',
    title: `${mentionerName} vous a mentionné`,
    content: commentExcerpt.slice(0, 100) + (commentExcerpt.length > 100 ? '...' : ''),
    link: `/rex/${rexId}#comments`,
  });
}

/**
 * Notify validators when a new REX is submitted for validation
 */
export async function notifyNewRexForValidation(
  rexId: string,
  rexTitle: string,
  sdisId: string
) {
  const supabase = await createClient();

  // Get all validators and admins for this SDIS
  const { data: validators } = await supabase
    .from('profiles')
    .select('id')
    .eq('sdis_id', sdisId)
    .in('role', ['validator', 'admin', 'super_admin']);

  if (!validators || validators.length === 0) return;

  // Create notifications for all validators
  const notifications = validators.map((v) => ({
    user_id: v.id,
    type: 'new_rex' as NotificationType,
    title: 'Nouveau RETEX à valider',
    content: rexTitle,
    link: `/rex/${rexId}`,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error('Error creating validation notifications:', error);
  }
}

/**
 * Notify SDIS members when a new REX is published
 */
export async function notifyNewRexPublished(
  rexId: string,
  rexTitle: string,
  sdisId: string,
  authorId: string
) {
  const supabase = await createClient();

  // Get all users from the same SDIS (except the author)
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('sdis_id', sdisId)
    .neq('id', authorId);

  if (!users || users.length === 0) return;

  // Create notifications for all users
  const notifications = users.map((u) => ({
    user_id: u.id,
    type: 'new_rex' as NotificationType,
    title: 'Nouveau RETEX publié',
    content: rexTitle,
    link: `/rex/${rexId}`,
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error('Error creating new rex notifications:', error);
  }
}
