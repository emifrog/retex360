import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { requireRole } from '@/lib/api-auth';
import { domainCreateSchema } from '@/lib/validators/api';
import { logger } from '@/lib/logger';

// Ajoute un domaine email autorisé (admin SDIS / super_admin).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireRole(supabase, ['admin', 'super_admin']);
    if ('response' in auth) return auth.response;
    const { profile } = auth;

    const limited = await limitByUser(rateLimiters.api, auth.user.id);
    if (limited) return limited;

    const body = await request.json();
    const validated = domainCreateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }
    const { domain } = validated.data;
    const isSuperAdmin = profile.role === 'super_admin';
    const sdisId = isSuperAdmin ? (validated.data.sdisId ?? profile.sdis_id) : profile.sdis_id;
    if (!sdisId) {
      return NextResponse.json({ error: 'SDIS cible requis' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('allowed_domains').insert({ domain, sdis_id: sdisId });
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ce domaine est déjà enregistré.' }, { status: 409 });
      }
      logger.error('Domain insert error:', error);
      return NextResponse.json({ error: "Erreur lors de l'ajout du domaine" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Domain error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
