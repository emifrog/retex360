import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RexCard } from '@/components/rex/rex-card'
import { RexFilters } from '@/components/rex/rex-filters'
import type { Prisma } from '@prisma/client'

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
  const user = await getCurrentUser()
  if (!user || !user.sdisId) redirect('/login')

  const sdisId = user.sdisId as string

  const page = Number(searchParams.page) || 1
  const pageSize = 10

  // Build where clause
  const where: Prisma.REXWhereInput = {
    sdisId,

    ...(searchParams.q && {
      OR: [
        { title: { contains: searchParams.q, mode: 'insensitive' } },
        { description: { contains: searchParams.q, mode: 'insensitive' } },
      ],
    }),
    ...(searchParams.type && { type: searchParams.type as any }),
    ...(searchParams.category && { category: searchParams.category as any }),
    ...(searchParams.status && { status: searchParams.status as any }),
  }

  // Build orderBy
  let orderBy: Prisma.REXOrderByWithRelationInput = { createdAt: 'desc' }
  if (searchParams.sort === 'oldest') orderBy = { createdAt: 'asc' }
  if (searchParams.sort === 'views') orderBy = { views: 'desc' }

  // Fetch data
  const [rex, totalCount] = await Promise.all([
    prisma.rEX.findMany({
      where,
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.rEX.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Retours d&apos;Expérience</h1>
            <p className="text-gray-500 text-sm">{totalCount} REX disponibles</p>
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
        {rex.length === 0 ? (
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
              <RexCard key={r.id} rex={r} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Affichage de {(page - 1) * pageSize + 1} à {Math.min(page * pageSize, totalCount)} sur {totalCount} REX
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