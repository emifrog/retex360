import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const { id: rexId } = await params;
    const supabase = await createClient();

    // Check auth and role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['validator', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Update REX status
    const { error } = await supabase
      .from('rex')
      .update({
        status: 'validated',
        validated_by: user.id,
        validated_at: new Date().toISOString(),
      })
      .eq('id', rexId)
      .eq('status', 'pending');

    if (error) {
      logger.error('Validation error:', error);
      return NextResponse.json({ error: 'Erreur lors de la validation' }, { status: 500 });
    }

    // Get REX author for notification
    const { data: rex } = await supabase
      .from('rex')
      .select('author_id, title')
      .eq('id', rexId)
      .single();

    if (rex) {
      // Create notification for author
      await supabase.from('notifications').insert({
        user_id: rex.author_id,
        type: 'validation',
        title: 'REX validé',
        content: `Votre REX "${rex.title}" a été validé`,
        link: `/rex/${rexId}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Validation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
