'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RexCard } from './rex-card';
import { RexFilters, type FilterState } from './rex-filters';
import { FileText, CheckCircle, Clock, FileEdit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Rex, Sdis, Profile } from '@/types';

interface RexWithRelations extends Rex {
  author?: Pick<Profile, 'full_name' | 'avatar_url'>;
  sdis?: Pick<Sdis, 'code' | 'name'>;
}

interface Stats {
  total: number;
  validated: number;
  pending: number;
  draft: number;
}

const LIMIT = 12;

export function RexList() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [rexList, setRexList] = useState<RexWithRelations[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({ total: 0, validated: 0, pending: 0, draft: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch REX data
  const fetchRex = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: LIMIT.toString(),
      });

      if (searchQuery) params.set('search', searchQuery);
      if (filters.type) params.set('type', filters.type);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.status) params.set('status', filters.status);

      const response = await fetch(`/api/rex?${params}`);
      if (!response.ok) throw new Error('Erreur de chargement');

      const data = await response.json();
      const newItems = data.data || [];
      
      if (append) {
        setRexList(prev => [...prev, ...newItems]);
      } else {
        setRexList(newItems);
      }
      
      setTotal(data.pagination.total);
      setHasMore(pageNum < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Erreur lors du chargement des REX');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [searchQuery, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/rex/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Stats error:', error);
    }
  }, []);

  // Fetch user favorites
  const fetchFavorites = useCallback(async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(new Set(data.favorites || []));
      }
    } catch (error) {
      console.error('Favorites error:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRex(1, false);
    fetchFavorites();
  }, [fetchRex, fetchFavorites]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchRex(page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, isLoadingMore, page, fetchRex]);

  // Reset on search/filter change
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setRexList([]);
    setPage(1);
    setHasMore(true);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setRexList([]);
    setPage(1);
    setHasMore(true);
  };

  const toggleFavorite = async (id: string) => {
    const isFavorited = favorites.has(id);
    
    try {
      const response = await fetch(`/api/rex/${id}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isFavorited) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
        toast.success(isFavorited ? 'Retiré des favoris' : 'Ajouté aux favoris');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const statsDisplay = [
    { label: 'Total', value: stats.total, icon: FileText, color: 'text-blue-500' },
    { label: 'Validés', value: stats.validated, icon: CheckCircle, color: 'text-green-500' },
    { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-orange-500' },
    { label: 'Brouillons', value: stats.draft, icon: FileEdit, color: 'text-gray-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsDisplay.map((stat) => (
          <div
            key={stat.label}
            className="bg-card/80 border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <RexFilters
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onViewChange={setView}
        view={view}
      />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} résultat{total > 1 ? 's' : ''}
          {rexList.length > 0 && total > rexList.length && (
            <span className="ml-1">({rexList.length} affichés)</span>
          )}
        </p>
      </div>

      {/* Initial Loading */}
      {isLoading && rexList.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Rex Grid/List */}
          <div
            className={cn(
              view === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            )}
          >
            {rexList.map((rex) => (
              <RexCard
                key={rex.id}
                rex={rex}
                onFavorite={toggleFavorite}
                isFavorite={favorites.has(rex.id)}
              />
            ))}
          </div>

          {/* Empty state */}
          {!isLoading && rexList.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun REX trouvé</h3>
              <p className="text-sm text-muted-foreground">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          )}

          {/* Load more trigger */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="flex items-center justify-center py-8"
            >
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Chargement...</span>
                </div>
              )}
            </div>
          )}

          {/* End of list */}
          {!hasMore && rexList.length > 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Tous les REX ont été chargés
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
