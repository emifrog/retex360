import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type Role = 'user' | 'validator' | 'admin' | 'super_admin';

export interface AuthedProfile {
  role: Role;
  sdis_id: string | null;
}

/**
 * Reusable authorization guards for API route handlers, replacing the
 * copy-pasted "getUser → 401 → fetch profile → role check → 403" block.
 *
 * Usage:
 *   const auth = await requireRole(supabase, ['admin', 'super_admin']);
 *   if ('response' in auth) return auth.response;
 *   const { user, profile } = auth;
 *
 * Responses use the `{ error }` shape, matching the API routes these guards
 * are applied to.
 */
export async function requireUser(
  supabase: SupabaseClient
): Promise<{ user: User } | { response: NextResponse }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  }
  return { user };
}

/**
 * Un admin de SDIS n'administre QUE son SDIS ; `super_admin` est transverse.
 *
 * Miroir applicatif des policies RLS (013 pour `rex`, 020 pour `rex_attachments`,
 * 021 pour `comments`). Sans ce test, la couche applicative laisse passer une
 * action que la base refusera ensuite — et PostgREST ne signale PAS par une
 * erreur une écriture réduite à 0 ligne par la RLS : le refus passe pour un
 * succès. Le contrôle applicatif doit donc être aussi étroit que la policy.
 */
export function isSdisAdmin(
  profile: { role: string; sdis_id?: string | null } | null | undefined,
  sdisId: string | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.role === 'super_admin') return true;
  if (profile.role !== 'admin') return false;
  return Boolean(sdisId) && profile.sdis_id === sdisId;
}

export async function requireRole(
  supabase: SupabaseClient,
  roles: Role[]
): Promise<{ user: User; profile: AuthedProfile } | { response: NextResponse }> {
  const guard = await requireUser(supabase);
  if ('response' in guard) return guard;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, sdis_id')
    .eq('id', guard.user.id)
    .single();

  if (!profile || !roles.includes(profile.role as Role)) {
    return { response: NextResponse.json({ error: 'Non autorisé' }, { status: 403 }) };
  }

  return { user: guard.user, profile: profile as AuthedProfile };
}
