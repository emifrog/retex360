'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { Rex, Sdis, Profile } from '@/types';
import type { FilterState } from '@/components/rex/rex-filters';

export interface RexWithRelations extends Rex {
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

export function useRexList() {
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
  const fetchRex = useCallback(
    async (pageNum: number, append: boolean = false) => {
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
        if (filters.type_production) params.set('type_production', filters.type_production);

        const response = await fetch(`/api/rex?${params}`);
        if (!response.ok) throw new Error('Erreur de chargement');

        const data = await response.json();
        const newItems = data.data || [];

        if (append) {
          setRexList((prev) => [...prev, ...newItems]);
        } else {
          setRexList(newItems);
        }

        setTotal(data.pagination.total);
        setHasMore(pageNum < data.pagination.totalPages);
        setPage(pageNum);
      } catch (error) {
        logger.error('Fetch error:', error);
        toast.error('Erreur lors du chargement des REX');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [searchQuery, filters]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/rex/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      logger.error('Stats error:', error);
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
      logger.error('Favorites error:', error);
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
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setRexList([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setRexList([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
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
        }
      } catch (error) {
        logger.error('Favorite toggle error:', error);
        toast.error('Erreur lors de la modification du favori');
      }
    },
    [favorites]
  );

  return {
    rexList,
    total,
    stats,
    favorites,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMoreRef,
    handleSearch,
    handleFilterChange,
    toggleFavorite,
  };
}
