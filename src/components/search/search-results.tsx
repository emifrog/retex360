import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, Building2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResultsProps {
  searchParams: {
    q?: string;
    type?: string;
    sdis?: string;
    severity?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    tags?: string;
    page?: string;
  };
}

const ITEMS_PER_PAGE = 10;

const severityConfig = {
  critique: { label: 'Critique', color: 'bg-red-500', textColor: 'text-red-500' },
  majeur: { label: 'Majeur', color: 'bg-orange-500', textColor: 'text-orange-500' },
  significatif: { label: 'Significatif', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
};

const statusConfig = {
  draft: { label: 'Brouillon', color: 'bg-gray-500' },
  pending: { label: 'En attente', color: 'bg-orange-500' },
  validated: { label: 'Validé', color: 'bg-green-500' },
  archived: { label: 'Archivé', color: 'bg-gray-400' },
};

export async function SearchResults({ searchParams }: SearchResultsProps) {
  const supabase = await createClient();
  const page = parseInt(searchParams.page || '1', 10);
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // Build query
  let query = supabase
    .from('rex')
    .select(`
      id,
      title,
      description,
      intervention_date,
      type,
      severity,
      status,
      views_count,
      tags,
      created_at,
      sdis:sdis_id(id, code, name),
      author:author_id(id, full_name, grade)
    `, { count: 'exact' });

  // Apply filters
  if (searchParams.q) {
    // Full-text search on title, description, context
    query = query.or(
      `title.ilike.%${searchParams.q}%,description.ilike.%${searchParams.q}%,context.ilike.%${searchParams.q}%,lessons_learned.ilike.%${searchParams.q}%`
    );
  }

  if (searchParams.type) {
    query = query.eq('type', searchParams.type);
  }

  if (searchParams.sdis) {
    query = query.eq('sdis_id', searchParams.sdis);
  }

  if (searchParams.severity) {
    query = query.eq('severity', searchParams.severity);
  }

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  } else {
    // By default, only show validated and pending
    query = query.in('status', ['validated', 'pending']);
  }

  if (searchParams.dateFrom) {
    query = query.gte('intervention_date', searchParams.dateFrom);
  }

  if (searchParams.dateTo) {
    query = query.lte('intervention_date', searchParams.dateTo);
  }

  if (searchParams.tags) {
    const tags = searchParams.tags.split(',');
    query = query.overlaps('tags', tags);
  }

  // Order and paginate
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  const { data: results, count, error } = await query;

  if (error) {
    console.error('Search error:', error);
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-destructive">Erreur lors de la recherche</p>
      </div>
    );
  }

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
  const hasFilters = Object.values(searchParams).some((v) => v);

  if (!results || results.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {hasFilters
            ? 'Aucun RETEX ne correspond à vos critères'
            : 'Utilisez les filtres ci-dessus pour rechercher des RETEX'}
        </p>
      </div>
    );
  }

  // Build pagination URL
  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page') params.set(key, value);
    });
    params.set('page', newPage.toString());
    return `/search?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{count}</span> résultat{count !== 1 ? 's' : ''} trouvé{count !== 1 ? 's' : ''}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
        )}
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {results.map((rex) => {
          const severity = severityConfig[rex.severity as keyof typeof severityConfig];
          const status = statusConfig[rex.status as keyof typeof statusConfig];
          const sdisData = Array.isArray(rex.sdis) ? rex.sdis[0] : rex.sdis;
          const authorData = Array.isArray(rex.author) ? rex.author[0] : rex.author;

          return (
            <Link
              key={rex.id}
              href={`/rex/${rex.id}`}
              className="block bg-card border border-border hover:border-primary/40 rounded-xl p-5 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={cn('w-2.5 h-2.5 rounded-full', severity?.color)}
                      style={{
                        boxShadow: `0 0 8px ${
                          rex.severity === 'critique'
                            ? '#ef4444'
                            : rex.severity === 'majeur'
                            ? '#f97316'
                            : '#eab308'
                        }50`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground uppercase font-medium">
                      {rex.type}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        rex.status === 'validated' && 'bg-green-500/10 text-green-500 border-green-500/30',
                        rex.status === 'pending' && 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                      )}
                    >
                      {status?.label}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-2">
                    {rex.title}
                  </h3>

                  {/* Description excerpt */}
                  {rex.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {rex.description}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      SDIS {sdisData?.code}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(rex.intervention_date).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {rex.views_count || 0}
                    </span>
                    {authorData && (
                      <span className="hidden sm:inline">
                        par {authorData.grade} {authorData.full_name}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {rex.tags && rex.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {rex.tags.slice(0, 4).map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-muted rounded text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                      {rex.tags.length > 4 && (
                        <span className="px-2 py-0.5 text-muted-foreground text-[10px]">
                          +{rex.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            asChild={page > 1}
          >
            {page > 1 ? (
              <Link href={buildPageUrl(page - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Link>
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </>
            )}
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  asChild={pageNum !== page}
                >
                  {pageNum !== page ? (
                    <Link href={buildPageUrl(pageNum)}>{pageNum}</Link>
                  ) : (
                    <span>{pageNum}</span>
                  )}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            asChild={page < totalPages}
          >
            {page < totalPages ? (
              <Link href={buildPageUrl(page + 1)}>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            ) : (
              <>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
