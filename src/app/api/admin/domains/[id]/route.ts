import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

// Supprime un domaine email autorisé (admin SDIS / super_admin).
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
    const { data: domain } = await admin
      .from('allowed_domains')
      .select('id, sdis_id')
      .eq('id', id)
      .maybeSingle();

    if (!domain) {
      return NextResponse.json({ error: 'Domaine introuvable' }, { status: 404 });
    }
    if (profile.role !== 'super_admin' && domain.sdis_id !== profile.sdis_id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { error } = await admin.from('allowed_domains').delete().eq('id', id);
    if (error) {
      logger.error('Domain delete error:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Domain delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
