import { createAdminClient } from '@/lib/supabase/server';
import { isPasswordCompromised } from '@/lib/password-breach';
import { getSubscriptionState } from '@/lib/subscription';

/**
 * Inscription sur invitation (modèle "invitation uniquement").
 * Le token brut n'est transmis que dans le lien d'invitation ; seul son hash
 * SHA-256 est stocké. Toutes les opérations passent par le rôle service.
 */
const INVITATION_TTL_DAYS = 7;

/** Génère un token d'invitation (32 octets, base64url). */
export function generateInvitationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

/** Hash SHA-256 (hex) du token — c'est ce qui est stocké en base. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Date d'expiration par défaut d'une invitation (ISO). */
export function invitationExpiry(): string {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 86400000).toISOString();
}

export interface ValidInvitation {
  id: string;
  email: string;
  sdis_id: string;
  role: string;
}

/** Récupère une invitation valide (non utilisée, non expirée) par token brut. */
export async function getValidInvitationByToken(token: string): Promise<ValidInvitation | null> {
  if (!token) return null;
  const admin = createAdminClient();
  const tokenHash = await hashToken(token);
  const { data, error } = await admin
    .from('invitations')
    .select('id, email, sdis_id, role, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.accepted_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return { id: data.id, email: data.email, sdis_id: data.sdis_id, role: data.role };
}

type RegisterResult = { ok: true; email: string } | { error: string };

/**
 * Valide l'invitation, vérifie le mot de passe (HIBP), crée le compte avec le
 * SDIS + rôle pré-assignés, et marque l'invitation comme utilisée (usage unique).
 * L'unicité de l'email garantit l'usage unique même en cas de double-soumission.
 */
export async function acceptInvitationAndRegister(params: {
  token: string;
  password: string;
  fullName: string;
  grade?: string | null;
}): Promise<RegisterResult> {
  const invitation = await getValidInvitationByToken(params.token);
  if (!invitation) {
    return { error: "Lien d'invitation invalide, déjà utilisé ou expiré." };
  }

  if (await isPasswordCompromised(params.password)) {
    return {
      error: 'Ce mot de passe figure dans une fuite de données connue. Veuillez en choisir un autre.',
    };
  }

  const admin = createAdminClient();

  // Gate final de la limite d'utilisateurs (7B) : couvre les invitations créées
  // avant d'atteindre le plafond et les inscriptions concurrentes.
  const subState = await getSubscriptionState(invitation.sdis_id);
  if (subState.maxUsers !== null) {
    const { count } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('sdis_id', invitation.sdis_id);
    if ((count ?? 0) >= subState.maxUsers) {
      return {
        error:
          "La limite d'utilisateurs de votre SDIS est atteinte. Contactez votre administrateur.",
      };
    }
  }

  // Email auto-confirmé : recevoir l'invitation prouve la maîtrise de l'adresse.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.fullName },
  });
  if (createError || !created.user) {
    const already = createError?.message?.toLowerCase().includes('already');
    return {
      error: already
        ? 'Un compte existe déjà pour cette adresse.'
        : 'Erreur lors de la création du compte.',
    };
  }

  // Profil avec SDIS + rôle pré-assignés par l'invitation.
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: created.user.id,
      email: invitation.email,
      full_name: params.fullName,
      grade: params.grade || null,
      sdis_id: invitation.sdis_id,
      role: invitation.role,
    },
    { onConflict: 'id' }
  );
  if (profileError) {
    return { error: 'Erreur lors de la création du profil.' };
  }

  // Usage unique : marquer l'invitation comme acceptée.
  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)
    .is('accepted_at', null);

  return { ok: true, email: invitation.email };
}
