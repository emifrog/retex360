import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { resetAdminSchema } from '@/lib/validators/super-admin';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/email';
import { logAdminAction } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Génère un lien de réinitialisation de mot de passe pour un membre d'un SDIS
// client (typiquement son admin). `id` = identifiant du SDIS. Super_admin only.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const validated = resetAdminSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }
    const { email } = validated.data;

    const admin = createAdminClient();

    // Le compte ciblé doit appartenir au SDIS concerné.
    const { data: target } = await admin
      .from('profiles')
      .select('id, sdis_id, role')
      .eq('email', email)
      .maybeSingle();
    if (!target || target.sdis_id !== id) {
      return NextResponse.json({ error: 'Compte introuvable pour ce SDIS' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/reset-password` },
    });
    if (linkError || !link?.properties?.action_link) {
      logger.error('Reset link generation error:', linkError);
      return NextResponse.json({ error: 'Erreur lors de la génération du lien' }, { status: 500 });
    }
    const resetUrl = link.properties.action_link;

    let emailSent = false;
    if (isEmailConfigured()) {
      emailSent = await sendPasswordResetEmail({ to: email, resetUrl });
    }

    await logAdminAction({
      actorId: user.id,
      actorEmail: user.email ?? null,
      action: 'sdis.reset_admin_password',
      targetType: 'profile',
      targetId: target.id,
      targetLabel: email,
      details: { sdisId: id, role: target.role },
    });

    return NextResponse.json({ success: true, resetUrl, emailSent });
  } catch (error) {
    logger.error('Reset admin password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
