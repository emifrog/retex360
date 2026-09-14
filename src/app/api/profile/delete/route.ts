import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { requireUser } from '@/lib/api-auth';

/**
 * Adresse de remplacement, dans un domaine réservé par la RFC 2606 : elle ne
 * peut atteindre personne, et reste unique par compte pour ne buter sur aucune
 * contrainte d'unicité, ici comme dans `auth.users`.
 */
function tombstoneEmail(userId: string): string {
  return `compte-supprime+${userId}@retex360.invalid`;
}

/**
 * Suppression de compte — conservation des contributions, effacement des
 * données personnelles.
 *
 * La version précédente supprimait la ligne `profiles` en comptant sur une
 * cascade : « cascade will handle rex, comments, favorites ». Cette cascade
 * n'existe pas. `rex.author_id`, `comments.author_id` et
 * `rex_attachments.uploaded_by` référencent `profiles(id)` sans `ON DELETE`,
 * c'est-à-dire en `NO ACTION`. Dès que l'agent avait écrit un seul REX, la
 * suppression échouait sur `rex_author_id_fkey` et la route répondait 500 : le
 * départ d'un contributeur était tout simplement impossible.
 *
 * Ajouter la cascade manquante aurait effacé les REX — y compris validés et
 * partagés avec d'autres SDIS. Un retour d'expérience validé n'appartient plus
 * seulement à son auteur : c'est la mémoire opérationnelle du service.
 *
 * Le compte est donc neutralisé plutôt que supprimé :
 *   * le profil devient une pierre tombale — nom, adresse, grade et avatar
 *     effacés, rôle ramené à `user` ;
 *   * les données purement personnelles (favoris, notifications) sont
 *     supprimées, elles n'intéressent personne d'autre ;
 *   * les REX et commentaires restent, attribués au profil anonymisé ;
 *   * le compte d'authentification est banni et son adresse neutralisée, ce qui
 *     ferme l'accès et libère l'adresse pour une éventuelle réinscription.
 *
 * Aucune donnée personnelle ne subsiste à l'issue : l'anonymisation vaut
 * effacement, sans détruire ce qui a été partagé.
 *
 * Ordre des opérations choisi pour que l'échec soit RATTRAPABLE : le profil
 * d'abord, la fermeture du compte en dernier. Si la dernière étape échoue,
 * l'agent est encore connecté et peut relancer l'opération, qui est idempotente.
 * L'ordre inverse l'aurait enfermé dehors avec un profil encore nominatif.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.auth, user.id);
    if (limited) return limited;

    // Validate confirmation from body
    const body = await request.json();
    if (body.confirmation !== 'SUPPRIMER MON COMPTE') {
      return NextResponse.json({ error: 'Confirmation invalide' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const anonymizedEmail = tombstoneEmail(user.id);

    // 1) Le profil devient anonyme. `sdis_id` est conservé : il porte le
    //    rattachement des REX, et ne dit rien de la personne.
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: 'Compte supprimé',
        email: anonymizedEmail,
        grade: null,
        avatar_url: null,
        role: 'user',
      })
      .eq('id', user.id);

    if (profileError) {
      logger.error('Account anonymization error:', profileError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression des données' },
        { status: 500 }
      );
    }

    // 2) Données strictement personnelles : rien ne justifie de les garder.
    //    Elles disparaissaient jusqu'ici par cascade depuis `profiles` ; le
    //    profil survivant, il faut les retirer explicitement.
    const [favoritesResult, notificationsResult] = await Promise.all([
      adminClient.from('favorites').delete().eq('user_id', user.id),
      adminClient.from('notifications').delete().eq('user_id', user.id),
    ]);

    // Non bloquant : le profil est déjà anonymisé, et un favori résiduel ne
    // désigne plus personne. Tracé pour pouvoir être repris.
    for (const [label, result] of [
      ['favorites', favoritesResult],
      ['notifications', notificationsResult],
    ] as const) {
      if (result.error) {
        logger.error(`Account deletion — ${label} cleanup failed`, {
          userId: user.id,
          error: result.error,
        });
      }
    }

    // 3) Fermeture du compte. Le bannissement coupe l'accès sans supprimer la
    //    ligne `auth.users`, dont `profiles.id` dépend (`ON DELETE CASCADE` :
    //    supprimer l'utilisateur emporterait le profil, et donc buterait à
    //    nouveau sur les REX). `email_confirm` évite l'envoi d'un courriel de
    //    confirmation à l'ancienne adresse.
    const { error: authError } = await adminClient.auth.admin.updateUserById(user.id, {
      email: anonymizedEmail,
      email_confirm: true,
      ban_duration: '876000h', // 100 ans — la durée « permanente » de Supabase
    });

    if (authError) {
      logger.error('Account closure error:', authError);
      return NextResponse.json(
        { error: 'Erreur lors de la fermeture du compte. Veuillez réessayer.' },
        { status: 500 }
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
