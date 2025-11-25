'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  REX_TYPES,
  REX_GRAVITIES,
  REX_CATEGORIES,
  REX_STATUSES,
  SORT_OPTIONS,
} from '@/lib/utils'
import { Search, X, Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'

interface RexFiltersAdvancedProps {
  totalCount?: number
  showMobileToggle?: boolean
}

export function RexFiltersAdvanced({ totalCount = 0, showMobileToggle = true }: RexFiltersAdvancedProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '')

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      // Reset page when filters change
      if (!updates.hasOwnProperty('page')) {
        params.delete('page')
      }

      return params.toString()
    },
    [searchParams]
  )

  const updateFilter = (key: string, value: string) => {
    startTransition(() => {
      router.push(`?${createQueryString({ [key]: value || null })}`)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter('q', searchValue)
  }

  const resetFilters = () => {
    setSearchValue('')
    startTransition(() => {
      router.push('/dashboard/rex')
    })
  }

  const hasActiveFilters =
    searchParams.get('q') ||
    searchParams.get('type') ||
    searchParams.get('gravity') ||
    searchParams.get('category') ||
    searchParams.get('status') ||
    searchParams.get('dateFrom') ||
    searchParams.get('dateTo')

  const activeFilterCount = [
    searchParams.get('q'),
    searchParams.get('type'),
    searchParams.get('gravity'),
    searchParams.get('category'),
    searchParams.get('status'),
    searchParams.get('dateFrom'),
    searchParams.get('dateTo'),
  ].filter(Boolean).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
      {/* Barre de recherche principale */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Recherche textuelle */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Rechercher par titre, description, lieu..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue('')
                    updateFilter('q', '')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          {/* Tri */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:inline">Trier par:</span>
            <select
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              value={searchParams.get('sort') || 'recent'}
              onChange={(e) => updateFilter('sort', e.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bouton filtres avancés (mobile) */}
          {showMobileToggle && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="sm:hidden flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres
              {activeFilterCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px]">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Filtres avancés */}
      <div className={cn(
        'transition-all duration-300 ease-in-out',
        isExpanded || !showMobileToggle ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 sm:max-h-[500px] sm:opacity-100'
      )}>
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="flex flex-wrap gap-3">
            {/* Type */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={searchParams.get('type') || ''}
                onChange={(e) => updateFilter('type', e.target.value)}
              >
                <option value="">Tous les types</option>
                {REX_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Gravité */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Gravité</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={searchParams.get('gravity') || ''}
                onChange={(e) => updateFilter('gravity', e.target.value)}
              >
                <option value="">Toutes gravités</option>
                {REX_GRAVITIES.map((gravity) => (
                  <option key={gravity.value} value={gravity.value}>
                    {gravity.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Catégorie */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Catégorie</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={searchParams.get('category') || ''}
                onChange={(e) => updateFilter('category', e.target.value)}
              >
                <option value="">Toutes catégories</option>
                {REX_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Statut */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Statut</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={searchParams.get('status') || ''}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                <option value="">Tous statuts</option>
                {REX_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtres de date */}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Date début</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={searchParams.get('dateFrom') || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Date fin</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={searchParams.get('dateTo') || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barre de résultats */}
      <div className="px-4 py-2.5 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium',
            isPending ? 'text-gray-400' : 'text-gray-700'
          )}>
            {isPending ? 'Chargement...' : `${totalCount} résultat${totalCount > 1 ? 's' : ''}`}
          </span>
          {hasActiveFilters && (
            <span className="text-xs text-gray-500">
              (filtré{activeFilterCount > 1 ? 's' : ''})
            </span>
          )}
        </div>

        {/* Tags des filtres actifs */}
        {hasActiveFilters && (
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {searchParams.get('q') && (
              <FilterTag
                label={`"${searchParams.get('q')}"`}
                onRemove={() => {
                  setSearchValue('')
                  updateFilter('q', '')
                }}
              />
            )}
            {searchParams.get('type') && (
              <FilterTag
                label={REX_TYPES.find(t => t.value === searchParams.get('type'))?.label || ''}
                onRemove={() => updateFilter('type', '')}
              />
            )}
            {searchParams.get('gravity') && (
              <FilterTag
                label={REX_GRAVITIES.find(g => g.value === searchParams.get('gravity'))?.label || ''}
                onRemove={() => updateFilter('gravity', '')}
              />
            )}
            {searchParams.get('category') && (
              <FilterTag
                label={REX_CATEGORIES.find(c => c.value === searchParams.get('category'))?.label || ''}
                onRemove={() => updateFilter('category', '')}
              />
            )}
            {searchParams.get('status') && (
              <FilterTag
                label={REX_STATUSES.find(s => s.value === searchParams.get('status'))?.label || ''}
                onRemove={() => updateFilter('status', '')}
              />
            )}
          </div>
        )}

        {/* Toggle filtres avancés (desktop) */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden sm:flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Masquer les filtres
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Plus de filtres
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-red-100 rounded-full p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
