import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { sdisOnboardSchema } from '@/lib/validators/super-admin';
import { generateInvitationToken, hashToken, invitationExpiry } from '@/lib/invitations';
import { isEmailConfigured, sendInvitationEmail } from '@/lib/email';
import { logAdminAction } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { PLAN_CONFIG } from '@/types';

const THIRTY_DAYS_MS = 30 * 86400000;
const iso = (d?: Date | null) => (d ? d.toISOString() : null);

// Onboarding d'un SDIS client (super_admin) : crée/enrichit le SDIS, son
// abonnement, ses domaines autorisés, et invite le compte admin initial.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();
    const auth = await requireRole(supabase, ['super_admin']);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const body = await request.json();
    const validated = sdisOnboardSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }
    const input = validated.data;
    const admin = createAdminClient();

    // Rollback : si une étape échoue APRÈS la création d'un nouveau SDIS, on nettoie
    // pour ne pas laisser de SDIS orphelin (onboarding non transactionnel).
    let createdSdisId: string | null = null;
    const rollbackNewSdis = async () => {
      if (!createdSdisId) return;
      await admin.from('allowed_domains').delete().eq('sdis_id', createdSdisId);
      await admin.from('subscriptions').delete().eq('sdis_id', createdSdisId);
      await admin.from('sdis').delete().eq('id', createdSdisId);
    };

    // 1) Résoudre le SDIS cible (existant) ou le créer.
    let sdis: { id: string; code: string; name: string };
    if (input.sdisId) {
      const { data: existing } = await admin
        .from('sdis')
        .select('id, code, name')
        .eq('id', input.sdisId)
        .maybeSingle();
      if (!existing) {
        return NextResponse.json({ error: 'SDIS introuvable' }, { status: 404 });
      }
      sdis = existing;
      // Enrichissement optionnel des infos d'onboarding.
      const patch: Record<string, unknown> = {};
      if (input.region) patch.region = input.region;
      if (input.departement) patch.departement = input.departement;
      if (input.logoUrl) patch.logo_url = input.logoUrl;
      if (Object.keys(patch).length > 0) {
        await admin.from('sdis').update(patch).eq('id', sdis.id);
      }
    } else {
      const { data: created, error: createError } = await admin
        .from('sdis')
        .insert({
          code: input.code,
          name: input.name,
          region: input.region ?? null,
          departement: input.departement ?? null,
          logo_url: input.logoUrl || null,
        })
        .select('id, code, name')
        .single();
      if (createError || !created) {
        if (createError?.code === '23505') {
          return NextResponse.json(
            {
              error: `Le code SDIS « ${input.code} » existe déjà — sélectionnez-le dans la liste.`,
            },
            { status: 409 }
          );
        }
        logger.error('SDIS create error:', createError);
        return NextResponse.json({ error: 'Erreur lors de la création du SDIS' }, { status: 500 });
      }
      sdis = created;
      createdSdisId = created.id;
    }

    // 2) Refuser si le SDIS est déjà client (abonnement existant).
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('id')
      .eq('sdis_id', sdis.id)
      .maybeSingle();
    if (existingSub) {
      return NextResponse.json(
        { error: 'Ce SDIS est déjà un client (abonnement existant).' },
        { status: 409 }
      );
    }

    // 3) Refuser si un compte existe déjà pour l'email admin.
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', input.adminEmail)
      .maybeSingle();
    if (existingProfile) {
      await rollbackNewSdis();
      return NextResponse.json(
        { error: 'Un compte existe déjà pour cette adresse administrateur.' },
        { status: 409 }
      );
    }

    // 4) Créer l'abonnement (limites = plan par défaut si non fournies).
    const defaults = PLAN_CONFIG[input.plan];
    const trialEndsAt =
      input.status === 'trial'
        ? (iso(input.trialEndsAt) ?? new Date(Date.now() + THIRTY_DAYS_MS).toISOString())
        : iso(input.trialEndsAt);

    const { error: subError } = await admin.from('subscriptions').insert({
      sdis_id: sdis.id,
      plan: input.plan,
      status: input.status,
      trial_ends_at: trialEndsAt,
      current_period_start: iso(input.currentPeriodStart),
      current_period_end: iso(input.currentPeriodEnd),
      max_users: input.maxUsers !== undefined ? input.maxUsers : defaults.maxUsers,
      max_rex_per_month:
        input.maxRexPerMonth !== undefined ? input.maxRexPerMonth : defaults.maxRexPerMonth,
    });
    if (subError) {
      logger.error('Subscription insert error:', subError);
      await rollbackNewSdis();
      return NextResponse.json(
        { error: "Erreur lors de la création de l'abonnement" },
        { status: 500 }
      );
    }

    // 5) Domaines autorisés (ignorer les doublons globaux).
    for (const domain of input.domains ?? []) {
      const { error: domError } = await admin
        .from('allowed_domains')
        .insert({ domain, sdis_id: sdis.id });
      if (domError && domError.code !== '23505') {
        logger.error('Domain insert error (onboarding):', domError);
      }
    }

    // 6) Inviter le compte admin initial (lien tokenisé à usage unique).
    const token = generateInvitationToken();
    const tokenHash = await hashToken(token);
    const { error: invError } = await admin.from('invitations').insert({
      email: input.adminEmail,
      sdis_id: sdis.id,
      role: 'admin',
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: invitationExpiry(),
    });
    if (invError) {
      logger.error('Admin invitation insert error:', invError);
      await rollbackNewSdis();
      return NextResponse.json(
        { error: "Échec de la création de l'invitation admin — onboarding annulé, réessayez." },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const inviteUrl = `${appUrl}/register?token=${token}`;

    let emailSent = false;
    if (isEmailConfigured()) {
      emailSent = await sendInvitationEmail({
        to: input.adminEmail,
        inviteUrl,
        sdisName: sdis.name,
        role: 'admin',
        expiresInDays: 7,
      });
    }

    await logAdminAction({
      actorId: user.id,
      actorEmail: user.email ?? null,
      action: 'sdis.onboard',
      targetType: 'sdis',
      targetId: sdis.id,
      targetLabel: `${sdis.code} — ${sdis.name}`,
      details: {
        plan: input.plan,
        status: input.status,
        adminEmail: input.adminEmail,
        domains: input.domains ?? [],
      },
    });

    return NextResponse.json({
      success: true,
      sdis,
      inviteUrl,
      emailSent,
      expiresInDays: 7,
    });
  } catch (error) {
    logger.error('SDIS onboarding error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
