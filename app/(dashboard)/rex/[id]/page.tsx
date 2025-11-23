import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { 
  formatDate, 
  getTypeLabel, 
  getTypeColor, 
  getSeverityLabel, 
  getSeverityColor,
  getStatusLabel,
  getStatusColor 
} from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PageProps {
  params: {
    id: string
  }
}

export default async function RexDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('sdis_id')
    .eq('id', user.id)
    .single()

  // Fetch REX with all relations
  const { data: rex, error } = await supabase
    .from('rex')
    .select(`
      *,
      author:users!rex_author_id_fkey(id, name, email, role),
      comments(
        *,
        author:users!comments_author_id_fkey(name, email)
      ),
      attachments(*),
      sdis:sdis_id(code, name)
    `)
    .eq('id', params.id)
    .eq('sdis_id', userData?.sdis_id) // Security: own SDIS only
    .single()

  if (error || !rex) {
    notFound()
  }

  // Type assertion for comments
  type Comment = {
    id: string
    content: string
    created_at: string
    author?: { name: string; email: string }
  }

  // Increment views (fire and forget)
  supabase
    .from('rex')
    .update({ views: (rex.views || 0) + 1 })
    .eq('id', params.id)
    .then()

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/rex">
            <Button variant="ghost">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour à la liste
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            {user.id === rex.author_id && (
              <Link href={`/dashboard/rex/${rex.id}/edit`}>
                <Button variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </Button>
              </Link>
            )}
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Partager
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-8">
        {/* Header REX */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <div className="flex items-start space-x-2 mb-4">
            <span className={cn('px-3 py-1 text-xs font-semibold rounded-full', getTypeColor(rex.type))}>
              {getTypeLabel(rex.type)}
            </span>
            <span className={cn('px-3 py-1 text-xs font-semibold rounded-full', getSeverityColor(rex.severity))}>
              {getSeverityLabel(rex.severity)}
            </span>
            <span className={cn('px-3 py-1 text-xs font-semibold rounded-full', getStatusColor(rex.status))}>
              {getStatusLabel(rex.status)}
            </span>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {rex.title}
          </h1>
          
          <div className="flex items-center space-x-6 text-gray-600 mb-6">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Par <strong>{rex.author?.name}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(rex.intervention_date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span>{rex.location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{rex.views} vues</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {rex.tags?.map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* AI Summary */}
        {rex.ai_summary && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">Résumé IA</h3>
                <p className="text-gray-700 leading-relaxed">{rex.ai_summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content sections */}
        <div className="space-y-6">
          <ContentSection icon="ℹ️" title="Contexte" content={rex.context} />
          <ContentSection icon="🔥" title="Actions menées" content={rex.actions} />
          <ContentSection icon="✅" title="Résultat" content={rex.outcome} />
          <ContentSection icon="🎓" title="Leçons apprises" content={rex.lessons} />
          <ContentSection icon="💡" title="Recommandations" content={rex.recommendations} />
        </div>

        {/* Comments */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Commentaires ({rex.comments?.length || 0})
          </h2>
          
          {!rex.comments || rex.comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun commentaire pour le moment</p>
          ) : (
            <div className="space-y-4">
              {(rex.comments as Comment[]).map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {comment.author?.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{comment.author?.name}</span>
                        <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ContentSection({ icon, title, content }: { icon: string; title: string; content: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <span className="text-2xl mr-3">{icon}</span>
        {title}
      </h2>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}