import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/api-auth';
import { isUuid } from '@/lib/supabase/filters';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rexId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 1000) : null;
    const supabase = await createClient();

    // Check auth and role
    const auth = await requireRole(supabase, ['validator', 'admin', 'super_admin']);
    if ('response' in auth) return auth.response;

    const limited = await limitByUser(rateLimiters.api, auth.user.id);
    if (limited) return limited;

    if (!isUuid(rexId)) {
      return NextResponse.json({ error: 'REX introuvable ou déjà traité' }, { status: 409 });
    }

    // Le rejet passe par la fonction `reject_rex` (migration 026), et non par
    // un UPDATE direct. Un UPDATE ne peut pas aboutir ici : il repasse le REX
    // en brouillon, or un brouillon n'est lisible que par son auteur, et
    // Postgres refuse une modification dont le résultat n'est plus lisible par
    // celui qui la fait (« new row violates row-level security policy »). Le
    // rejet échouait donc pour TOUS les validateurs.
    //
    // La fonction vérifie elle-même le droit de l'appelant (validateur du SDIS
    // du REX, SDIS non en lecture seule) : l'autorisation reste dans la base.
    // Elle ne renvoie aucune ligne si le REX est introuvable, déjà traité, ou
    // hors du périmètre de l'appelant.
    const { data, error } = await supabase.rpc('reject_rex', {
      target_rex: rexId,
      reason,
    });

    if (error) {
      logger.error('Reject error:', error);
      return NextResponse.json({ error: 'Erreur lors du rejet' }, { status: 500 });
    }

    const rex = (data as { author_id: string; title: string }[] | null)?.[0];

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
