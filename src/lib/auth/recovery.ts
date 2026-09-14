/**
 * Marque « cette session vient d'un lien de récupération ».
 *
 * Le changement de mot de passe ordinaire (`/api/profile/password`) exige le
 * mot de passe actuel. La récupération, elle, ne peut pas : c'est précisément ce
 * que l'utilisateur a oublié. Sa preuve, c'est le lien reçu par courriel — donc
 * il faut pouvoir distinguer une session née de ce lien d'une session ordinaire.
 *
 * `supabase.auth.getUser()` ne le dit pas : il renvoie un utilisateur
 * authentifié, sans indiquer par quel moyen. `POST /api/auth/reset-password` se
 * contentait donc de « une session existe » — n'importe quelle session déjà
 * ouverte permettait de changer le mot de passe sans connaître l'ancien.
 *
 * Ce cookie est posé par `/api/auth/callback` après vérification effective du
 * lien, et retiré dès le mot de passe changé. Il est `httpOnly` : le navigateur
 * le transmet, aucun script de la page ne peut le forger.
 *
 * Durée courte et volontairement plus stricte que celle du lien Supabase : le
 * temps de choisir un mot de passe, pas celui d'oublier un onglet ouvert.
 */
export const RECOVERY_COOKIE = 'retex360-pwd-recovery';

/** 15 minutes, en secondes. */
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60;
