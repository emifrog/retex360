'use client';

import { useState, useEffect, useCallback } from 'react';
import { RexCard } from './rex-card';
import { RexFilters, type FilterState } from './rex-filters';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Clock, FileEdit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Rex, Sdis, Profile } from '@/types';

interface RexWithRelations extends Rex {
  author?: Pick<Profile, 'full_name' | 'avatar_url'>;
  sdis?: Pick<Sdis, 'code' | 'name'>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  total: number;
  validated: number;
  pending: number;
  draft: number;
}

export function RexList() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [rexList, setRexList] = useState<RexWithRelations[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<Stats>({ total: 0, validated: 0, pending: 0, draft: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchRex = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.set('search', searchQuery);
      if (filters.type) params.set('type', filters.type);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.status) params.set('status', filters.status);

      const response = await fetch(`/api/rex?${params}`);
      if (!response.ok) throw new Error('Erreur de chargement');

      const data = await response.json();
      setRexList(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Erreur lors du chargement des REX');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, filters]);

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

  useEffect(() => {
    fetchRex();
  }, [fetchRex]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          {pagination.total} résultat{pagination.total > 1 ? 's' : ''}
          {isLoading && <Loader2 className="w-4 h-4 ml-2 inline animate-spin" />}
        </p>
      </div>

      {/* Rex Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
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
      )}

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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Précédent
          </Button>
          
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            let pageNum: number;
            if (pagination.totalPages <= 5) {
              pageNum = i + 1;
            } else if (pagination.page <= 3) {
              pageNum = i + 1;
            } else if (pagination.page >= pagination.totalPages - 2) {
              pageNum = pagination.totalPages - 4 + i;
            } else {
              pageNum = pagination.page - 2 + i;
            }
            
            return (
              <Button
                key={pageNum}
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className={cn(
                  pagination.page === pageNum && 'bg-primary text-primary-foreground'
                )}
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
