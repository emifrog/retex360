import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

// Révoque une invitation en attente (admin SDIS / super_admin).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await requireRole(supabase, ['admin', 'super_admin']);
    if ('response' in auth) return auth.response;
    const { profile } = auth;

    const limited = await limitByUser(rateLimiters.api, auth.user.id);
    if (limited) return limited;

    const admin = createAdminClient();
    const { data: invitation } = await admin
      .from('invitations')
      .select('id, sdis_id, accepted_at')
      .eq('id', id)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
    }
    // Un admin SDIS ne peut révoquer que les invitations de son SDIS.
    if (profile.role !== 'super_admin' && invitation.sdis_id !== profile.sdis_id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    // On ne révoque qu'une invitation encore en attente.
    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'Invitation déjà acceptée' }, { status: 400 });
    }

    const { error } = await admin.from('invitations').delete().eq('id', id);
    if (error) {
      logger.error('Invitation delete error:', error);
      return NextResponse.json({ error: 'Erreur lors de la révocation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Invitation delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
