'use client';

import { useState } from 'react';
import { RexCard } from './rex-card';
import { RexCardSkeleton } from './rex-card-skeleton';
import { RexFilters } from './rex-filters';
import { FileText, CheckCircle, Clock, FileEdit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRexList } from '@/lib/hooks/use-rex-list';

const statsConfig = [
  { label: 'Total', key: 'total' as const, icon: FileText, color: 'text-blue-500' },
  { label: 'Validés', key: 'validated' as const, icon: CheckCircle, color: 'text-green-500' },
  { label: 'En attente', key: 'pending' as const, icon: Clock, color: 'text-orange-500' },
  { label: 'Brouillons', key: 'draft' as const, icon: FileEdit, color: 'text-gray-500' },
];

export function RexList() {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const {
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
  } = useRexList();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsConfig.map((stat) => (
          <div
            key={stat.label}
            className="bg-card/80 border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats[stat.key].toLocaleString('fr-FR')}</p>
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
        <div className={cn(
          view === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <RexCardSkeleton key={i} />
          ))}
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
