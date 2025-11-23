import { Suspense } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RexCard } from '@/components/rex/rex-card'
import { RexFilters } from '@/components/rex/rex-filters'

interface PageProps {
  searchParams: {
    q?: string
    type?: string
    category?: string
    status?: string
    sort?: string
    page?: string
  }
}

export default async function RexPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user data with SDIS
  const { data: userData } = await supabase
    .from('users')
    .select('sdis_id')
    .eq('id', user.id)
    .single()

  if (!userData?.sdis_id) {
    throw new Error('User not associated with a SDIS')
  }

  const page = Number(searchParams.page) || 1
  const pageSize = 10
  const offset = (page - 1) * pageSize

  // Build query
  let query = supabase
    .from('rex')
    .select(`
      *,
      author:users!rex_author_id_fkey(name, email),
      comments(count)
    `, { count: 'exact' })
    .eq('sdis_id', userData.sdis_id)

  // Filters
  if (searchParams.q) {
    query = query.or(`title.ilike.%${searchParams.q}%,description.ilike.%${searchParams.q}%`)
  }
  if (searchParams.type) {
    query = query.eq('type', searchParams.type)
  }
  if (searchParams.category) {
    query = query.eq('category', searchParams.category)
  }
  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  // Sort
  const sortOrder = searchParams.sort === 'oldest' ? 'asc' : 'desc'
  const sortColumn = searchParams.sort === 'views' ? 'views' : 'created_at'
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

  // Pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data: rex, error, count } = await query

  if (error) {
    console.error('Error fetching REX:', error)
    throw error
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Retours d&apos;Expérience</h1>
            <p className="text-gray-500 text-sm">{count || 0} REX disponibles</p>
          </div>
          <div className="flex items-center space-x-4">
            <form action="/dashboard/rex" method="get">
              <input 
                type="text"
                name="q"
                defaultValue={searchParams.q}
                placeholder="Rechercher..." 
                className="w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </form>
            <Link href="/dashboard/rex/new">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau REX
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        <RexFilters />

        {/* REX List */}
        {!rex || rex.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun REX trouvé</h3>
            <p className="text-gray-500 mb-6">Commencez par créer votre premier retour d&apos;expérience</p>
            <Link href="/dashboard/rex/new">
              <Button>Créer un REX</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rex.map((r) => (
              <RexCard 
                key={r.id} 
                rex={{
                  ...r,
                  _count: { comments: r.comments?.[0]?.count || 0 }
                }} 
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Affichage de {offset + 1} à {Math.min(offset + pageSize, count || 0)} sur {count || 0} REX
            </div>
            <div className="flex space-x-2">
              {page > 1 && (
                <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}>
                  <Button variant="outline">Précédent</Button>
                </Link>
              )}
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Link key={pageNum} href={`?${new URLSearchParams({ ...searchParams, page: String(pageNum) })}`}>
                    <Button variant={page === pageNum ? 'default' : 'outline'}>
                      {pageNum}
                    </Button>
                  </Link>
                )
              })}
              
              {page < totalPages && (
                <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}>
                  <Button variant="outline">Suivant</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}