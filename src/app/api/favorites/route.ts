import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('rex_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Favorites fetch error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const favoriteIds = favorites?.map(f => f.rex_id) || [];
    return NextResponse.json({ favorites: favoriteIds });
  } catch (error) {
    console.error('Favorites error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
