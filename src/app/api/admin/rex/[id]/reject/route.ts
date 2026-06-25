import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/api-auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const { id: rexId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 1000) : null;
    const supabase = await createClient();

    // Check auth and role
    const auth = await requireRole(supabase, ['validator', 'admin', 'super_admin']);
    if ('response' in auth) return auth.response;

    // Update REX status back to draft + récupère la ligne pour confirmer le rejet réel
    // (no-op silencieux sinon : REX inexistant, déjà traité, ou RLS inter-SDIS).
    const { data: rex, error } = await supabase
      .from('rex')
      .update({
        status: 'draft',
        rejection_reason: reason,
      })
      .eq('id', rexId)
      .eq('status', 'pending')
      .select('author_id, title')
      .maybeSingle();

    if (error) {
      logger.error('Reject error:', error);
      return NextResponse.json({ error: 'Erreur lors du rejet' }, { status: 500 });
    }

    if (!rex) {
      return NextResponse.json({ error: 'REX introuvable ou déjà traité' }, { status: 409 });
    }

    // Notification destinée à l'auteur : via le client admin (la RLS interdit
    // au client utilisateur d'écrire une notification pour autrui).
    await createAdminClient()
      .from('notifications')
      .insert({
        user_id: rex.author_id,
        type: 'rejection',
        title: 'RETEX rejeté',
        content: reason
          ? `Votre REX "${rex.title}" a été rejeté. Raison : ${reason}`
          : `Votre REX "${rex.title}" a été rejeté. Veuillez le modifier et le soumettre à nouveau.`,
        link: `/rex/${rexId}`,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Reject error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
