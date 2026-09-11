import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { requireUser } from '@/lib/api-auth';

export async function GET() {
  try {
    const supabase = await createClient();

    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.api, user.id);
    if (limited) return limited;

    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('rex_id')
      .eq('user_id', user.id);

    if (error) {
      logger.error('Favorites fetch error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const favoriteIds = favorites?.map((f) => f.rex_id) || [];
    return NextResponse.json({ favorites: favoriteIds });
  } catch (error) {
    logger.error('Favorites error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
