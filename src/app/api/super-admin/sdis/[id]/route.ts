import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { subscriptionUpdateSchema } from '@/lib/validators/super-admin';
import { logAdminAction } from '@/lib/audit';
import { logger } from '@/lib/logger';

const iso = (d?: Date | null) => (d ? d.toISOString() : null);

// Met à jour l'abonnement d'un SDIS : changement de plan, suspension/réactivation,
// dates de période, limites. `id` = identifiant du SDIS. Super_admin uniquement.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireRole(supabase, ['super_admin']);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const body = await request.json();
    const validated = subscriptionUpdateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }
    const input = validated.data;

    const admin = createAdminClient();
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, plan, status, sdis:sdis_id(code, name)')
      .eq('sdis_id', id)
      .maybeSingle();
    if (!sub) {
      return NextResponse.json({ error: 'Abonnement introuvable pour ce SDIS' }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.plan !== undefined) patch.plan = input.plan;
    if (input.status !== undefined) patch.status = input.status;
    if (input.trialEndsAt !== undefined) patch.trial_ends_at = iso(input.trialEndsAt);
    if (input.currentPeriodStart !== undefined)
      patch.current_period_start = iso(input.currentPeriodStart);
    if (input.currentPeriodEnd !== undefined)
      patch.current_period_end = iso(input.currentPeriodEnd);
    if (input.maxUsers !== undefined) patch.max_users = input.maxUsers;
    if (input.maxRexPerMonth !== undefined) patch.max_rex_per_month = input.maxRexPerMonth;

    // Cohérence du motif de suspension.
    if (input.suspendedReason !== undefined) {
      patch.suspended_reason = input.suspendedReason;
    } else if (input.status !== undefined && input.status !== 'suspended') {
      patch.suspended_reason = null;
    }

    const { error } = await admin.from('subscriptions').update(patch).eq('sdis_id', id);
    if (error) {
      logger.error('Subscription update error:', error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de l'abonnement" },
        { status: 500 }
      );
    }

    // Action d'audit la plus parlante selon le changement principal.
    let action = 'sdis.subscription_update';
    if (input.status === 'suspended') action = 'sdis.suspend';
    else if (input.status && sub.status === 'suspended') action = 'sdis.reactivate';
    else if (input.plan && input.plan !== sub.plan) action = 'sdis.plan_change';

    const sdisRel = (Array.isArray(sub.sdis) ? sub.sdis[0] : sub.sdis) as {
      code: string;
      name: string;
    } | null;
    await logAdminAction({
      actorId: user.id,
      actorEmail: user.email ?? null,
      action,
      targetType: 'subscription',
      targetId: id,
      targetLabel: sdisRel ? `${sdisRel.code} — ${sdisRel.name}` : id,
      details: {
        from: { plan: sub.plan, status: sub.status },
        to: input,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Subscription update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
