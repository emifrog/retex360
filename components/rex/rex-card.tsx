import Link from 'next/link'
import { formatDate, getTypeLabel, getTypeColor, getSeverityLabel, getSeverityColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { RexWithAuthor } from '@/lib/types/supabase'

interface RexCardProps {
  rex: RexWithAuthor
}

export function RexCard({ rex }: RexCardProps) {
  const commentsCount = rex._count?.comments || 0

  return (
    <Link href={`/dashboard/rex/${rex.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-3">
              <span className={cn('px-3 py-1 text-xs font-semibold rounded-full', getTypeColor(rex.type))}>
                {getTypeLabel(rex.type)}
              </span>
              <span className={cn('px-3 py-1 text-xs font-semibold rounded-full', getSeverityColor(rex.severity))}>
                {getSeverityLabel(rex.severity)}
              </span>
              {rex.status === 'PUBLISHED' && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  ✓ PUBLIÉ
                </span>
              )}
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
              {rex.title}
            </h3>
            
            <p className="text-gray-600 mb-4 line-clamp-2">
              {rex.description}
            </p>
            
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {rex.location}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(rex.intervention_date)}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {rex.author?.name || 'Anonyme'}
              </span>
            </div>
          </div>
          
          <div className="ml-6 text-right">
            <div className="flex items-center space-x-4 mb-2">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{rex.views || 0}</div>
                <div className="text-xs text-gray-500">vues</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{commentsCount}</div>
                <div className="text-xs text-gray-500">comments</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {formatDate(rex.created_at)}
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {rex.tags?.slice(0, 3).map((tag: string) => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  #{tag}
                </span>
              ))}
              {rex.tags && rex.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  +{rex.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}