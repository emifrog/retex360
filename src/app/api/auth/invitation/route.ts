import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, limitByIp } from '@/lib/rate-limit';
import { getValidInvitationByToken } from '@/lib/invitations';

// Renvoie les infos d'une invitation valide (pour pré-remplir la page d'inscription).
export async function GET(request: NextRequest) {
  const limited = await limitByIp(rateLimiters.auth, request);
  if (limited) return limited;

  const token = new URL(request.url).searchParams.get('token') || '';
  const invitation = await getValidInvitationByToken(token);
  if (!invitation) {
    return NextResponse.json({ valid: false });
  }

  const admin = createAdminClient();
  const { data: sdis } = await admin
    .from('sdis')
    .select('code, name')
    .eq('id', invitation.sdis_id)
    .single();

  return NextResponse.json({
    valid: true,
    email: invitation.email,
    role: invitation.role,
    sdis: sdis ? { code: sdis.code, name: sdis.name } : null,
  });
}
