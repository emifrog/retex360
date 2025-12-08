'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import { REX_TYPES, SEVERITIES, STATUSES } from '@/types';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  sdisList: { id: string; code: string; name: string }[];
  allTags: string[];
  currentParams: {
    q?: string;
    type?: string;
    sdis?: string;
    severity?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    tags?: string;
  };
}

const severityLabels = {
  critique: 'Critique',
  majeur: 'Majeur',
  significatif: 'Significatif',
};

const statusLabels = {
  draft: 'Brouillon',
  pending: 'En attente',
  validated: 'Validé',
  archived: 'Archivé',
};

export function SearchFilters({ sdisList, allTags, currentParams }: SearchFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(currentParams.q || '');
  const [type, setType] = useState(currentParams.type || '');
  const [sdis, setSdis] = useState(currentParams.sdis || '');
  const [severity, setSeverity] = useState(currentParams.severity || '');
  const [status, setStatus] = useState(currentParams.status || '');
  const [dateFrom, setDateFrom] = useState(currentParams.dateFrom || '');
  const [dateTo, setDateTo] = useState(currentParams.dateTo || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    currentParams.tags ? currentParams.tags.split(',') : []
  );
  const [showAllTags, setShowAllTags] = useState(false);

  const hasActiveFilters = query || type || sdis || severity || status || dateFrom || dateTo || selectedTags.length > 0;

  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (type) params.set('type', type);
    if (sdis) params.set('sdis', sdis);
    if (severity) params.set('severity', severity);
    if (status) params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    return `/search?${params.toString()}`;
  };

  const handleSearch = () => {
    startTransition(() => {
      router.push(buildSearchUrl());
    });
  };

  const handleReset = () => {
    setQuery('');
    setType('');
    setSdis('');
    setSeverity('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setSelectedTags([]);
    startTransition(() => {
      router.push('/search');
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const displayedTags = showAllTags ? allTags : allTags.slice(0, 12);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-6">
        {/* Search bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, description, contexte..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={isPending}>
            {isPending ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="ml-2">Rechercher</span>
          </Button>
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Type d&apos;intervention
            </label>
            <Select value={type || 'all'} onValueChange={(v) => setType(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {REX_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SDIS */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              SDIS
            </label>
            <Select value={sdis || 'all'} onValueChange={(v) => setSdis(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les SDIS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les SDIS</SelectItem>
                {sdisList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    SDIS {s.code} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Sévérité
            </label>
            <Select value={severity || 'all'} onValueChange={(v) => setSeverity(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sévérités</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {severityLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Statut
            </label>
            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Date de début
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Date de fin
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                Tags
              </label>
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTags([])}
                  className="h-6 text-xs"
                >
                  Effacer les tags
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {displayedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedTags.includes(tag)
                      ? 'bg-primary hover:bg-primary/90'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {allTags.length > 12 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="h-6 text-xs"
                >
                  {showAllTags ? 'Voir moins' : `+${allTags.length - 12} tags`}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Active filters & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filtres actifs</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
