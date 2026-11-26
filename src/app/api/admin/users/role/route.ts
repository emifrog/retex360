import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { roleUpdateSchema } from '@/lib/validators/api';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { canChangeRole, requireRole } from '@/lib/api-auth';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validation Zod
    const validated = roleUpdateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { userId, role } = validated.data;

    // Check auth and admin role
    const auth = await requireRole(supabase, ['admin', 'super_admin']);
    if ('response' in auth) return auth.response;
    const { user, profile: currentProfile } = auth;

    const limited = await limitByUser(rateLimiters.api, auth.user.id);
    if (limited) return limited;

    // Get target user
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, role, sdis_id')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Règles regroupées dans `canChangeRole` : périmètre du SDIS, protection du
    // rôle super_admin dans les deux sens (ni le donner, ni le retirer sans
    // l'être soi-même), et interdiction de modifier son propre rôle.
    const decision = canChangeRole(
      { id: user.id, role: currentProfile.role, sdis_id: currentProfile.sdis_id },
      targetUser,
      role
    );
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status });
    }

    // Update role via admin client: the RLS policy on `profiles` only allows
    // `auth.uid() = id`, so a user-context update of another user's row matches
    // 0 rows and fails silently. Authorization is already enforced above.
    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select('id')
      .single();

    if (error || !updated) {
      logger.error('Role update error:', error);
      return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Role update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
