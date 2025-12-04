import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FavoritesList } from '@/components/favorites/favorites-list';

export default async function FavoritesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get user's favorites with REX data
  const { data: favorites } = await supabase
    .from('favorites')
    .select(`
      id,
      created_at,
      rex:rex_id(
        id,
        title,
        slug,
        type,
        severity,
        status,
        intervention_date,
        description,
        views_count,
        favorites_count,
        created_at,
        author:author_id(full_name, avatar_url),
        sdis:sdis_id(code, name)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Transform data to match expected format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformedFavorites = (favorites || []).map((fav: any) => {
    const rex = Array.isArray(fav.rex) ? fav.rex[0] : fav.rex;
    if (!rex) return null;
    
    return {
      id: fav.id,
      created_at: fav.created_at,
      rex: {
        ...rex,
        author: Array.isArray(rex.author) ? rex.author[0] : rex.author,
        sdis: Array.isArray(rex.sdis) ? rex.sdis[0] : rex.sdis,
      },
    };
  }).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes favoris</h1>
        <p className="text-muted-foreground">
          Les REX que vous avez sauvegardés pour consultation ultérieure
        </p>
      </div>

      <FavoritesList favorites={transformedFavorites as Parameters<typeof FavoritesList>[0]['favorites']} />
    </div>
  );
}
