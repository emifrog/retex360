import Link from 'next/link'
import {
  formatDate,
  getTypeLabel,
  getTypeColor,
  getTypeIcon,
  getGravityLabel,
  getGravityColor,
  getGravityIcon,
  getStatusLabel,
  getStatusColor,
  getCategoryLabel,
  getCategoryIcon,
  getVisibilityIcon,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { RexWithAuthor } from '@/lib/types/rex'
import { MapPin, Calendar, User, Eye, MessageSquare, Tag } from 'lucide-react'

interface RexCardProps {
  rex: RexWithAuthor
  variant?: 'default' | 'compact'
}

export function RexCard({ rex, variant = 'default' }: RexCardProps) {
  const commentsCount = rex._count?.comments || 0
  const isCompact = variant === 'compact'

  return (
    <Link href={`/rex/${rex.id}`} className="block group">
      <article className={cn(
        'bg-white rounded-xl border border-gray-200 transition-all duration-200',
        'hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5',
        isCompact ? 'p-4' : 'p-6'
      )}>
        {/* Header avec badges */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Type */}
            <span className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border',
              getTypeColor(rex.type)
            )}>
              <span>{getTypeIcon(rex.type)}</span>
              {getTypeLabel(rex.type)}
            </span>

            {/* Gravité */}
            {rex.gravity && (
              <span className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border',
                getGravityColor(rex.gravity)
              )}>
                <span>{getGravityIcon(rex.gravity)}</span>
                {getGravityLabel(rex.gravity)}
              </span>
            )}

            {/* Catégorie */}
            {rex.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                <span>{getCategoryIcon(rex.category)}</span>
                <span className="hidden sm:inline">{getCategoryLabel(rex.category)}</span>
              </span>
            )}
          </div>

          {/* Statut */}
          <span className={cn(
            'px-2.5 py-1 text-xs font-semibold rounded-full border',
            getStatusColor(rex.status)
          )}>
            {getStatusLabel(rex.status)}
          </span>
        </div>

        {/* Titre */}
        <h3 className={cn(
          'font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors',
          isCompact ? 'text-lg' : 'text-xl'
        )}>
          {rex.title}
        </h3>

        {/* Description */}
        {!isCompact && (
          <p className="text-gray-600 mb-4 line-clamp-2 text-sm leading-relaxed">
            {rex.description}
          </p>
        )}

        {/* Métadonnées */}
        <div className={cn(
          'flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500',
          isCompact ? 'mb-3' : 'mb-4'
        )}>
          {/* Lieu */}
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="truncate max-w-[150px]">{rex.location}</span>
          </span>

          {/* Date intervention */}
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            {formatDate(rex.intervention_date)}
          </span>

          {/* Auteur */}
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 text-gray-400" />
            <span className="truncate max-w-[120px]">
              {rex.author?.name || 'Anonyme'}
              {rex.author?.rank && <span className="text-gray-400"> ({rex.author.rank})</span>}
            </span>
          </span>
        </div>

        {/* Footer avec stats et tags */}
        <div className={cn(
          'flex items-center justify-between pt-4 border-t border-gray-100',
          isCompact && 'pt-3'
        )}>
          {/* Tags */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {rex.tags && rex.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {rex.tags.slice(0, 3).map((tag) => (
                  <span
                    key={typeof tag === 'string' ? tag : tag.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md"
                  >
                    <Tag className="h-3 w-3" />
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
                {rex.tags.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">
                    +{rex.tags.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-400">Aucun tag</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 ml-4">
            {/* Visibilité */}
            {rex.visibility && (
              <span className="text-gray-400" title={`Visibilité: ${rex.visibility}`}>
                {getVisibilityIcon(rex.visibility)}
              </span>
            )}

            {/* Vues */}
            <div className="flex items-center gap-1.5 text-gray-500">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">{rex.view_count || 0}</span>
            </div>

            {/* Commentaires */}
            <div className="flex items-center gap-1.5 text-gray-500">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-medium">{commentsCount}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

// Variante skeleton pour le chargement
export function RexCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const isCompact = variant === 'compact'

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 animate-pulse',
      isCompact ? 'p-4' : 'p-6'
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-24 bg-gray-200 rounded-full" />
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>

      {/* Titre */}
      <div className={cn('h-6 bg-gray-200 rounded mb-2', isCompact ? 'w-3/4' : 'w-full')} />

      {/* Description */}
      {!isCompact && (
        <>
          <div className="h-4 bg-gray-200 rounded mb-1 w-full" />
          <div className="h-4 bg-gray-200 rounded mb-4 w-2/3" />
        </>
      )}

      {/* Métadonnées */}
      <div className="flex gap-4 mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-4">
          <div className="h-5 w-10 bg-gray-200 rounded" />
          <div className="h-5 w-10 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}
