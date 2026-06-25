import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { invitationRegisterSchema } from '@/lib/validators/api';
import { acceptInvitationAndRegister } from '@/lib/invitations';
import { logger } from '@/lib/logger';

// Inscription sur invitation uniquement (cf. lib/invitations + server action register).
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = await rateLimiters.auth.limit(ip);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset);
  }

  try {
    const body = await request.json();

    const validated = invitationRegisterSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const result = await acceptInvitationAndRegister({
      token: validated.data.token,
      password: validated.data.password,
      fullName: validated.data.fullName,
      grade: validated.data.grade ?? null,
    });
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Register error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
