import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { invitationCreateSchema } from '@/lib/validators/api';
import { generateInvitationToken, hashToken, invitationExpiry } from '@/lib/invitations';
import { isEmailConfigured, sendInvitationEmail } from '@/lib/email';
import { getSubscriptionState } from '@/lib/subscription';
import { logger } from '@/lib/logger';

// Crée une invitation (admin SDIS / super_admin) et renvoie le lien à transmettre.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();
    const auth = await requireRole(supabase, ['admin', 'super_admin']);
    if ('response' in auth) return auth.response;
    const { user, profile } = auth;

    const body = await request.json();
    const validated = invitationCreateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }
    const { email, role } = validated.data;
    const isSuperAdmin = profile.role === 'super_admin';

    // SDIS cible : super_admin choisit, admin est forcé sur son propre SDIS.
    const sdisId = isSuperAdmin ? (validated.data.sdisId ?? profile.sdis_id) : profile.sdis_id;
    if (!sdisId) {
      return NextResponse.json({ error: 'SDIS cible requis' }, { status: 400 });
    }

    // Un admin SDIS ne peut inviter qu'en user/validator.
    if (!isSuperAdmin && (role === 'admin' || role === 'super_admin')) {
      return NextResponse.json({ error: 'Rôle non autorisé pour un admin SDIS' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Restriction secondaire : si des domaines sont configurés pour ce SDIS,
    // l'email invité doit appartenir à l'un d'eux.
    const domain = email.split('@')[1]?.toLowerCase() ?? '';
    const { data: domains } = await admin
      .from('allowed_domains')
      .select('domain')
      .eq('sdis_id', sdisId);
    if (domains && domains.length > 0 && !domains.some((d) => d.domain.toLowerCase() === domain)) {
      return NextResponse.json(
        { error: `Le domaine « ${domain} » n'est pas autorisé pour ce SDIS.` },
        { status: 400 }
      );
    }

    // Ne pas inviter une adresse déjà rattachée à un compte.
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existingProfile) {
      return NextResponse.json(
        { error: 'Un compte existe déjà pour cette adresse.' },
        { status: 409 }
      );
    }

    // Limite d'utilisateurs par plan (7B) : refuser si le SDIS est déjà au plafond.
    const subState = await getSubscriptionState(sdisId);
    if (subState.maxUsers !== null) {
      const { count } = await admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('sdis_id', sdisId);
      if ((count ?? 0) >= subState.maxUsers) {
        return NextResponse.json(
          { error: `Limite d'utilisateurs atteinte pour ce SDIS (max ${subState.maxUsers}).` },
          { status: 403 }
        );
      }
    }

    const token = generateInvitationToken();
    const tokenHash = await hashToken(token);
    const { error: insertError } = await admin.from('invitations').insert({
      email,
      sdis_id: sdisId,
      role,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: invitationExpiry(),
    });
    if (insertError) {
      logger.error('Invitation insert error:', insertError);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'invitation" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const inviteUrl = `${appUrl}/register?token=${token}`;

    // Envoi automatique de l'email si SMTP est configuré (sinon le lien est
    // simplement renvoyé à l'admin pour transmission manuelle).
    let emailSent = false;
    if (isEmailConfigured()) {
      const { data: sdisRow } = await admin.from('sdis').select('name').eq('id', sdisId).single();
      emailSent = await sendInvitationEmail({
        to: email,
        inviteUrl,
        sdisName: sdisRow?.name ?? null,
        role,
        expiresInDays: 7,
      });
    }

    return NextResponse.json({ success: true, email, inviteUrl, expiresInDays: 7, emailSent });
  } catch (error) {
    logger.error('Invitation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
