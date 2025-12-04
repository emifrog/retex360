'use client';

import { useState } from 'react';
import { Search, Filter, X, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { REX_TYPES, SEVERITIES, STATUSES } from '@/types';

interface RexFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterState) => void;
  onViewChange: (view: 'grid' | 'list') => void;
  view: 'grid' | 'list';
}

export interface FilterState {
  type?: string;
  severity?: string;
  status?: string;
  sdis?: string;
}

export function RexFilters({
  onSearch,
  onFilterChange,
  onViewChange,
  view,
}: RexFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search and View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par titre, tags, type..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-card/50"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'border-primary text-primary' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtres
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 bg-primary text-primary-foreground">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className={view === 'grid' ? 'bg-muted' : ''}
            onClick={() => onViewChange('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={view === 'list' ? 'bg-muted' : ''}
            onClick={() => onViewChange('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card/80 border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Filtres avancés</h3>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground"
              >
                <X className="w-3 h-3 mr-1" />
                Effacer tout
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.type || ''}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Type d'intervention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                {REX_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.severity || ''}
              onValueChange={(value) => handleFilterChange('severity', value)}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Criticité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes criticités</SelectItem>
                {SEVERITIES.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous statuts</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'draft'
                      ? 'Brouillon'
                      : status === 'pending'
                      ? 'En attente'
                      : status === 'validated'
                      ? 'Validé'
                      : 'Archivé'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sdis || ''}
              onValueChange={(value) => handleFilterChange('sdis', value)}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="SDIS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les SDIS</SelectItem>
                <SelectItem value="06">SDIS 06</SelectItem>
                <SelectItem value="13">SDIS 13</SelectItem>
                <SelectItem value="83">SDIS 83</SelectItem>
                <SelectItem value="84">SDIS 84</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
