import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient, createStaticClient, createAdminClient } from '@/lib/supabase/server';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults } from '@/components/search/search-results';
import { Search } from 'lucide-react';

// Liste des SDIS — donnée de référence, identique pour tout le monde
// (`sdis` est en `FOR SELECT USING (true)`). Cache global légitime, avec un
// client SANS cookies : `unstable_cache` refuse toute source dynamique, et
// `createClient()` en lit.
const getCachedSdisList = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    const { data } = await supabase.from('sdis').select('id, code, name').order('code');
    return data || [];
  },
  ['sdis-list'],
  { revalidate: 3600 }
);

/**
 * Tags disponibles — mis en cache PAR SDIS.
 *
 * Ce cache était global (`['rex-tags']`) alors que son contenu était filtré par
 * la RLS de `rex`, donc par le SDIS de l'appelant : le premier utilisateur à
 * charger la page remplissait le cache avec SES tags, et pendant dix minutes
 * les autres SDIS voyaient cette liste. Les tags ne sont pas le contenu d'un
 * REX, mais ils en nomment les sujets, les lieux et les opérations.
 *
 * Le filtre est désormais EXPLICITE et le `sdisId` entre dans la clé de cache,
 * comme pour les tendances du tableau de bord (`dashboard/insights`) : REX
 * validés du SDIS, plus les REX validés inter-SDIS et publics des autres —
 * exactement ce que la RLS (migration 013) laisse voir à un membre du SDIS.
 */
function getCachedTags(sdisId: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data } = await admin
        .from('rex')
        .select('tags')
        .eq('status', 'validated')
        .not('tags', 'is', null)
        // `sdisId` est un UUID lu en base, pas une entrée utilisateur.
        .or(`sdis_id.eq.${sdisId},visibility.in.(inter_sdis,public)`);
      return Array.from(new Set(data?.flatMap((r) => r.tags || []) || [])).sort();
    },
    ['rex-tags', sdisId],
    { revalidate: 600, tags: ['rex-tags', `rex-tags:${sdisId}`] }
  )();
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    sdis?: string;
    severity?: string;
    status?: string;
    interSdis?: string;
    semantic?: string;
    dateFrom?: string;
    dateTo?: string;
    tags?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  // Le SDIS est lu HORS du cache et passé en argument : c'est ce que demande
  // `unstable_cache`, et c'est aussi ce qui rend la clé de cache des tags
  // spécifique au tenant.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('sdis_id').eq('id', user.id).single()
    : { data: null };

  const [sdisList, allTags] = await Promise.all([
    getCachedSdisList(),
    // Sans SDIS rattaché, aucun corpus cloisonné : pas de tags à proposer.
    profile?.sdis_id ? getCachedTags(profile.sdis_id) : Promise.resolve<string[]>([]),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Search className="w-7 h-7 text-primary" />
          Recherche avancée
        </h1>
        <p className="text-muted-foreground mt-1">
          Recherchez parmi tous les RETEX avec des filtres avancés
        </p>
      </div>

      {/* Filters */}
      <SearchFilters sdisList={sdisList || []} allTags={allTags} currentParams={params} />

      {/* Results */}
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResults searchParams={params} />
      </Suspense>
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-3" />
          <div className="h-3 bg-muted rounded w-1/2 mb-2" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}
