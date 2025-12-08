import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults } from '@/components/search/search-results';
import { Search } from 'lucide-react';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    sdis?: string;
    severity?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    tags?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch SDIS list for filter
  const { data: sdisList } = await supabase
    .from('sdis')
    .select('id, code, name')
    .order('code');

  // Fetch all unique tags from REX
  const { data: rexWithTags } = await supabase
    .from('rex')
    .select('tags')
    .not('tags', 'is', null);

  const allTags = Array.from(
    new Set(rexWithTags?.flatMap((r) => r.tags || []) || [])
  ).sort();

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
      <SearchFilters 
        sdisList={sdisList || []} 
        allTags={allTags}
        currentParams={params}
      />

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
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-4 animate-pulse"
        >
          <div className="h-4 bg-muted rounded w-3/4 mb-3" />
          <div className="h-3 bg-muted rounded w-1/2 mb-2" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}
