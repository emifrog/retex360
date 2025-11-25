import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RexCard, RexCardSkeleton } from '@/components/rex/rex-card'
import { RexFiltersAdvanced } from '@/components/rex/rex-filters-advanced'
import type { RexSearchParams } from '@/lib/types/rex'
import { Plus, FileText, ChevronLeft, ChevronRight } from 'lucide-react'

interface PageProps {
  searchParams: Promise<RexSearchParams>
}

export default async function RexPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user data with SDIS
  const { data: userData } = await supabase
    .from('users')
    .select('sdis_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.sdis_id) {
    throw new Error('Utilisateur non associé à un SDIS')
  }

  // Pagination
  const page = Number(params.page) || 1
  const pageSize = 12
  const offset = (page - 1) * pageSize

  // Build query
  let query = supabase
    .from('rex')
    .select(`
      *,
      author:users!rex_author_id_fkey(id, name, email, rank, unit),
      sdis:sdis_id(id, code, name),
      comments(count)
    `, { count: 'exact' })

  // Visibilité: propres REX + SDIS + NATIONAL (pas les privés des autres)
  query = query.or(`author_id.eq.${user.id},visibility.eq.NATIONAL,and(visibility.eq.SDIS,sdis_id.eq.${userData.sdis_id}),and(visibility.eq.REGIONAL,sdis_id.eq.${userData.sdis_id})`)

  // Filtres
  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%,location.ilike.%${params.q}%`)
  }
  if (params.type) {
    query = query.eq('type', params.type)
  }
  if (params.gravity) {
    query = query.eq('gravity', params.gravity)
  }
  if (params.category) {
    query = query.eq('category', params.category)
  }
  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.dateFrom) {
    query = query.gte('intervention_date', params.dateFrom)
  }
  if (params.dateTo) {
    query = query.lte('intervention_date', params.dateTo)
  }

  // Tri
  switch (params.sort) {
    case 'oldest':
      query = query.order('intervention_date', { ascending: true })
      break
    case 'views':
      query = query.order('view_count', { ascending: false })
      break
    case 'gravity':
      query = query.order('gravity', { ascending: false })
      break
    case 'title':
      query = query.order('title', { ascending: true })
      break
    case 'recent':
    default:
      query = query.order('intervention_date', { ascending: false })
      break
  }

  // Pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data: rexList, error, count } = await query

  if (error) {
    console.error('Erreur récupération REX:', error)
    throw error
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0
  const totalCount = count || 0

  // Transformer les données pour correspondre au type
  const formattedRexList = rexList?.map(rex => ({
    ...rex,
    _count: { comments: rex.comments?.[0]?.count || 0 }
  })) || []

  // Construire l'URL avec les paramètres actuels pour la pagination
  const buildPageUrl = (newPage: number) => {
    const urlParams = new URLSearchParams()
    if (params.q) urlParams.set('q', params.q)
    if (params.type) urlParams.set('type', params.type)
    if (params.gravity) urlParams.set('gravity', params.gravity)
    if (params.category) urlParams.set('category', params.category)
    if (params.status) urlParams.set('status', params.status)
    if (params.sort) urlParams.set('sort', params.sort)
    if (params.dateFrom) urlParams.set('dateFrom', params.dateFrom)
    if (params.dateTo) urlParams.set('dateTo', params.dateTo)
    urlParams.set('page', String(newPage))
    return `?${urlParams.toString()}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-red-500" />
                Retours d&apos;Expérience
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Consultez et partagez les REX de votre SDIS
              </p>
            </div>
            <Link href="/dashboard/rex/new">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau REX
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtres */}
        <RexFiltersAdvanced totalCount={totalCount} />

        {/* Liste des REX */}
        {formattedRexList.length === 0 ? (
          <EmptyState hasFilters={Boolean(params.q || params.type || params.gravity || params.category || params.status)} />
        ) : (
          <>
            {/* Grille de cartes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              {formattedRexList.map((rex) => (
                <RexCard key={rex.id} rex={rex} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                buildPageUrl={buildPageUrl}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

// Composant État vide
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {hasFilters ? 'Aucun résultat' : 'Aucun REX disponible'}
        </h3>
        <p className="text-gray-500 mb-6">
          {hasFilters
            ? 'Essayez de modifier vos filtres ou votre recherche'
            : 'Commencez par créer votre premier retour d\'expérience pour partager vos connaissances'}
        </p>
        {!hasFilters && (
          <Link href="/dashboard/rex/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Créer un REX
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

// Composant Pagination
function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  buildPageUrl,
}: {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  buildPageUrl: (page: number) => string
}) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  // Calcul des pages à afficher
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      // Afficher toutes les pages si peu de pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Toujours afficher la première page
      pages.push(1)

      // Calculer la plage autour de la page courante
      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)

      // Ajuster si on est au début ou à la fin
      if (currentPage <= 3) {
        end = 4
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3
      }

      // Ajouter ellipsis au début si nécessaire
      if (start > 2) {
        pages.push('ellipsis')
      }

      // Ajouter les pages du milieu
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      // Ajouter ellipsis à la fin si nécessaire
      if (end < totalPages - 1) {
        pages.push('ellipsis')
      }

      // Toujours afficher la dernière page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">
        Affichage de <span className="font-medium text-gray-700">{startItem}</span> à{' '}
        <span className="font-medium text-gray-700">{endItem}</span> sur{' '}
        <span className="font-medium text-gray-700">{totalCount}</span> REX
      </p>

      <div className="flex items-center gap-1">
        {/* Bouton Précédent */}
        {currentPage > 1 ? (
          <Link href={buildPageUrl(currentPage - 1)}>
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Précédent</span>
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Précédent</span>
          </Button>
        )}

        {/* Numéros de page */}
        <div className="hidden sm:flex items-center gap-1">
          {getVisiblePages().map((pageNum, idx) => (
            pageNum === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400">
                ...
              </span>
            ) : (
              <Link key={pageNum} href={buildPageUrl(pageNum)}>
                <Button
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  className="min-w-[36px]"
                >
                  {pageNum}
                </Button>
              </Link>
            )
          ))}
        </div>

        {/* Indicateur mobile */}
        <span className="sm:hidden text-sm text-gray-500 px-3">
          {currentPage} / {totalPages}
        </span>

        {/* Bouton Suivant */}
        {currentPage < totalPages ? (
          <Link href={buildPageUrl(currentPage + 1)}>
            <Button variant="outline" size="sm" className="gap-1">
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled className="gap-1">
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
