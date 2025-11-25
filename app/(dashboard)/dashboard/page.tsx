import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import {
  FileText,
  CheckCircle,
  Clock,
  Eye,
  Flame,
  Ambulance,
  Car,
  Zap,
  Lightbulb,
  User,
  MessageSquare,
  MapPin,
  Calendar,
} from 'lucide-react'
import { formatDate, getTypeLabel, getTypeColor, getGravityLabel, getGravityColor } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's SDIS
  const { data: userData } = await supabase
    .from('users')
    .select('sdis_id')
    .eq('id', user.id)
    .single()

  // Stats queries
  const [
    { count: totalRex },
    { count: publishedRex },
    { count: pendingRex },
    { data: recentRex },
    { data: categoryStats },
  ] = await Promise.all([
    // Total REX accessible
    supabase
      .from('rex')
      .select('*', { count: 'exact', head: true })
      .or(`author_id.eq.${user.id},visibility.eq.NATIONAL,and(visibility.eq.SDIS,sdis_id.eq.${userData?.sdis_id})`),
    // Published
    supabase
      .from('rex')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'VALIDE')
      .or(`author_id.eq.${user.id},visibility.eq.NATIONAL,and(visibility.eq.SDIS,sdis_id.eq.${userData?.sdis_id})`),
    // Pending
    supabase
      .from('rex')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'EN_ATTENTE')
      .eq('author_id', user.id),
    // Recent REX
    supabase
      .from('rex')
      .select(`
        id,
        title,
        type,
        gravity,
        status,
        location,
        intervention_date,
        created_at,
        view_count,
        author:users!rex_author_id_fkey(name, rank)
      `)
      .or(`author_id.eq.${user.id},visibility.eq.NATIONAL,and(visibility.eq.SDIS,sdis_id.eq.${userData?.sdis_id})`)
      .order('created_at', { ascending: false })
      .limit(3),
    // Category stats (simplified)
    supabase
      .from('rex')
      .select('type')
      .or(`author_id.eq.${user.id},visibility.eq.NATIONAL,and(visibility.eq.SDIS,sdis_id.eq.${userData?.sdis_id})`),
  ])

  // Calculate category counts
  const categoryCounts = {
    INTERVENTION: 0,
    EXERCICE: 0,
    FORMATION: 0,
    TECHNIQUE: 0,
    AUTRE: 0,
  }
  categoryStats?.forEach((rex) => {
    if (rex.type && categoryCounts[rex.type as keyof typeof categoryCounts] !== undefined) {
      categoryCounts[rex.type as keyof typeof categoryCounts]++
    }
  })

  // Get comment counts for recent REX
  const rexIds = recentRex?.map(r => r.id) || []
  const { data: commentCounts } = rexIds.length > 0
    ? await supabase
        .from('comments')
        .select('rex_id')
        .in('rex_id', rexIds)
    : { data: [] }

  const commentCountMap = new Map<string, number>()
  commentCounts?.forEach(c => {
    commentCountMap.set(c.rex_id, (commentCountMap.get(c.rex_id) || 0) + 1)
  })

  // Calculate total views this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthlyViews } = await supabase
    .from('rex')
    .select('view_count')
    .gte('created_at', startOfMonth.toISOString())
    .or(`author_id.eq.${user.id},visibility.eq.NATIONAL,and(visibility.eq.SDIS,sdis_id.eq.${userData?.sdis_id})`)

  const totalViews = monthlyViews?.reduce((sum, r) => sum + (r.view_count || 0), 0) || 0

  const maxCategory = Math.max(...Object.values(categoryCounts), 1)

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    return `Il y a ${diffDays} jours`
  }

  return (
    <div>
      <DashboardHeader
        title="Dashboard"
        subtitle="Vue d'ensemble de votre activité REX"
      />

      <div className="p-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-green-500 text-sm font-semibold">+12%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{totalRex || 0}</div>
            <div className="text-gray-500 text-sm">REX totaux</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-green-500 text-sm font-semibold">+8%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{publishedRex || 0}</div>
            <div className="text-gray-500 text-sm">Publiés</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-orange-500 text-sm font-semibold">{pendingRex || 0}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{pendingRex || 0}</div>
            <div className="text-gray-500 text-sm">En attente</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-green-500 text-sm font-semibold">+45%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews}
            </div>
            <div className="text-gray-500 text-sm">Vues ce mois</div>
          </div>
        </div>

        {/* Charts & Recent REX */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent activity */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">REX récents</h2>
              <Link href="/rex" className="text-red-600 hover:text-red-700 text-sm font-medium">
                Voir tout &rarr;
              </Link>
            </div>

            <div className="space-y-4">
              {recentRex && recentRex.length > 0 ? (
                recentRex.map((rex) => {
                  const author = rex.author as unknown as { name: string; rank: string } | null
                  return (
                    <Link
                      key={rex.id}
                      href={`/rex/${rex.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(rex.type || 'AUTRE')}`}>
                              {getTypeLabel(rex.type || 'AUTRE')}
                            </span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getGravityColor(rex.gravity || 'SANS_GRAVITE')}`}>
                              {getGravityLabel(rex.gravity || 'SANS_GRAVITE')}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900">{rex.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {rex.location} - {formatDate(rex.intervention_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{formatTimeAgo(rex.created_at)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {author?.rank ? `${author.rank} ${author.name}` : author?.name || 'Anonyme'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {commentCountMap.get(rex.id) || 0} commentaires
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {rex.view_count || 0} vues
                        </span>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucun REX disponible</p>
                  <Link href="/rex/new" className="text-red-600 hover:text-red-700 text-sm font-medium mt-2 inline-block">
                    Créer votre premier REX &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Categories & Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Par catégorie</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-700">Intervention</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${(categoryCounts.INTERVENTION / maxCategory) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                      {categoryCounts.INTERVENTION}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ambulance className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-700">Exercice</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${(categoryCounts.EXERCICE / maxCategory) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                      {categoryCounts.EXERCICE}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Car className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-700">Formation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${(categoryCounts.FORMATION / maxCategory) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                      {categoryCounts.FORMATION}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-700">Technique</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${(categoryCounts.TECHNIQUE / maxCategory) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                      {categoryCounts.TECHNIQUE}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Tip */}
            <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-6 text-white">
              <Lightbulb className="h-8 w-8 mb-4 opacity-80" />
              <h3 className="font-bold text-lg mb-2">Conseil IA du jour</h3>
              <p className="text-red-100 text-sm mb-4">
                {totalRex && totalRex > 0
                  ? `${totalRex} REX sont disponibles. Consultez les plus récents pour identifier les tendances et améliorer vos pratiques.`
                  : "Commencez à créer des REX pour capitaliser sur vos expériences et partager vos bonnes pratiques."}
              </p>
              <Link
                href="/rex"
                className="inline-block bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition"
              >
                Voir les REX
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
