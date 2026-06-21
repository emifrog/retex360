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
