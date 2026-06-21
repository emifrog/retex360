import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { roleUpdateSchema } from '@/lib/validators/api';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/api-auth';

export async function PUT(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validation Zod
    const validated = roleUpdateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId, role } = validated.data;

    // Check auth and admin role
    const auth = await requireRole(supabase, ['admin', 'super_admin']);
    if ('response' in auth) return auth.response;
    const { user, profile: currentProfile } = auth;

    const isSuperAdmin = currentProfile.role === 'super_admin';

    // Get target user
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, role, sdis_id')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Admin can only modify users from their SDIS
    if (!isSuperAdmin && targetUser.sdis_id !== currentProfile.sdis_id) {
      return NextResponse.json({ error: 'Non autorisé pour cet utilisateur' }, { status: 403 });
    }

    // Only super_admin can create super_admin
    if (role === 'super_admin' && !isSuperAdmin) {
      return NextResponse.json({ error: 'Seul un super admin peut créer un super admin' }, { status: 403 });
    }

    // Cannot demote yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre rôle' }, { status: 400 });
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
