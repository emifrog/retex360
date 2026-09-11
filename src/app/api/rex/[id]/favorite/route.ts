import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { requireUser } from '@/lib/api-auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rexId } = await params;
    const supabase = await createClient();

    // Get current user
    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.api, user.id);
    if (limited) return limited;

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('rex_id', rexId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Déjà dans les favoris' }, { status: 400 });
    }

    // Add to favorites
    const { error } = await supabase.from('favorites').insert({
      user_id: user.id,
      rex_id: rexId,
    });

    if (error) {
      logger.error('Favorite error:', error);
      return NextResponse.json({ error: "Erreur lors de l'ajout aux favoris" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Favorite error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rexId } = await params;
    const supabase = await createClient();

    // Get current user
    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.api, user.id);
    if (limited) return limited;

    // Remove from favorites
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('rex_id', rexId);

    if (error) {
      logger.error('Unfavorite error:', error);
      return NextResponse.json({ error: 'Erreur lors du retrait des favoris' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Unfavorite error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
