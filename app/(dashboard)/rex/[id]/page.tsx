import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
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
  getStatusIcon,
  getCategoryLabel,
  getCategoryIcon,
  getVisibilityLabel,
  getVisibilityIcon,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { RexResources } from '@/lib/types/rex'
import {
  ArrowLeft,
  Edit,
  Share2,
  MapPin,
  Calendar,
  User,
  Eye,
  Clock,
  Building2,
  MessageSquare,
  FileText,
  Lightbulb,
  Target,
  CheckCircle,
  BookOpen,
  AlertTriangle,
  Truck,
  Users,
  Paperclip,
  Download,
  Tag,
  Sparkles,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RexDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('sdis_id, role')
    .eq('id', user.id)
    .single()

  // Fetch REX with all relations
  const { data: rex, error } = await supabase
    .from('rex')
    .select(`
      *,
      author:users!rex_author_id_fkey(id, name, email, rank, unit, image),
      validated_by:validated_by_id(id, name, rank),
      sdis:sdis_id(id, code, name, department, region),
      comments(
        id,
        content,
        created_at,
        parent_id,
        author:users!comments_author_id_fkey(id, name, rank, image)
      ),
      attachments(id, name, url, type, size, created_at)
    `)
    .eq('id', id)
    .single()

  if (error || !rex) {
    notFound()
  }

  // Vérifier les permissions de visibilité
  const canView =
    rex.author_id === user.id ||
    rex.visibility === 'NATIONAL' ||
    (rex.visibility === 'SDIS' && rex.sdis_id === userData?.sdis_id) ||
    (rex.visibility === 'REGIONAL' && rex.sdis_id === userData?.sdis_id)

  if (!canView) {
    notFound()
  }

  const isAuthor = user.id === rex.author_id

  // Increment views (fire and forget)
  supabase
    .from('rex')
    .update({ view_count: (rex.view_count || 0) + 1 })
    .eq('id', id)
    .then()

  // Récupérer les tags
  const { data: tagRelations } = await supabase
    .from('rex_tags')
    .select('tag:tags(id, name)')
    .eq('rex_id', id)

  const tags = (tagRelations?.flatMap(tr => tr.tag ? [tr.tag] : []) || []) as unknown as { id: string; name: string }[]

  // Parser les resources si c'est une string JSON
  let resources: RexResources | null = null
  if (rex.resources) {
    try {
      resources = typeof rex.resources === 'string'
        ? JSON.parse(rex.resources)
        : rex.resources
    } catch {
      resources = null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/rex" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Retour à la liste</span>
            </Link>
            <div className="flex items-center gap-2">
              {isAuthor && (
                <Link href={`/rex/${rex.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contenu principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header du REX */}
              <section className={cn(
                'bg-white rounded-xl border-l-4 p-6 shadow-sm',
                rex.gravity === 'TRES_GRAVE' ? 'border-l-red-500' :
                rex.gravity === 'GRAVE' ? 'border-l-orange-500' :
                rex.gravity === 'MODEREE' ? 'border-l-yellow-500' :
                rex.gravity === 'FAIBLE' ? 'border-l-blue-500' :
                'border-l-green-500'
              )}>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border',
                    getTypeColor(rex.type)
                  )}>
                    <span>{getTypeIcon(rex.type)}</span>
                    {getTypeLabel(rex.type)}
                  </span>

                  {rex.gravity && (
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border',
                      getGravityColor(rex.gravity)
                    )}>
                      <span>{getGravityIcon(rex.gravity)}</span>
                      {getGravityLabel(rex.gravity)}
                    </span>
                  )}

                  {rex.category && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
                      <span>{getCategoryIcon(rex.category)}</span>
                      {getCategoryLabel(rex.category)}
                    </span>
                  )}

                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border ml-auto',
                    getStatusColor(rex.status)
                  )}>
                    {getStatusIcon(rex.status)} {getStatusLabel(rex.status)}
                  </span>
                </div>

                {/* Titre */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  {rex.title}
                </h1>

                {/* Métadonnées principales */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{rex.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(rex.intervention_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Eye className="h-4 w-4 text-gray-400" />
                    <span>{rex.view_count || 0} vues</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <span>{rex.comments?.length || 0} commentaires</span>
                  </div>
                </div>
              </section>

              {/* Résumé IA */}
              {rex.ai_summary && (
                <section className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 mb-2">Résumé IA</h2>
                      <p className="text-gray-700 leading-relaxed">{rex.ai_summary}</p>
                      {rex.ai_keywords && rex.ai_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {rex.ai_keywords.map((keyword: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Description */}
              <ContentSection
                icon={<FileText className="h-5 w-5" />}
                title="Description"
                content={rex.description}
                color="blue"
              />

              {/* Contexte */}
              {rex.context && (
                <ContentSection
                  icon={<Target className="h-5 w-5" />}
                  title="Contexte de l'intervention"
                  content={rex.context}
                  color="indigo"
                />
              )}

              {/* Actions menées */}
              {rex.actions && (
                <ContentSection
                  icon={<AlertTriangle className="h-5 w-5" />}
                  title="Actions menées"
                  content={rex.actions}
                  color="orange"
                />
              )}

              {/* Résultats */}
              {rex.outcome && (
                <ContentSection
                  icon={<CheckCircle className="h-5 w-5" />}
                  title="Résultats obtenus"
                  content={rex.outcome}
                  color="green"
                />
              )}

              {/* Leçons apprises */}
              {rex.lessons && (
                <ContentSection
                  icon={<BookOpen className="h-5 w-5" />}
                  title="Leçons apprises"
                  content={rex.lessons}
                  color="purple"
                />
              )}

              {/* Recommandations */}
              {rex.recommendations && (
                <ContentSection
                  icon={<Lightbulb className="h-5 w-5" />}
                  title="Recommandations"
                  content={rex.recommendations}
                  color="yellow"
                />
              )}

              {/* Moyens engagés */}
              {resources && (resources.engins?.length || resources.effectifs?.length || resources.autresMoyens) && (
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <Truck className="h-4 w-4 text-red-600" />
                    </div>
                    Moyens engagés
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Engins */}
                    {resources.engins && resources.engins.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Engins
                        </h3>
                        <div className="space-y-2">
                          {resources.engins.map((engin, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                              <div>
                                <span className="font-medium text-gray-900">{engin.type}</span>
                                {engin.description && (
                                  <p className="text-sm text-gray-500">{engin.description}</p>
                                )}
                              </div>
                              <span className="text-lg font-bold text-red-600">x{engin.nombre}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Effectifs */}
                    {resources.effectifs && resources.effectifs.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Effectifs
                        </h3>
                        <div className="space-y-2">
                          {resources.effectifs.map((effectif, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                              <span className="font-medium text-gray-900">{effectif.grade}</span>
                              <span className="text-lg font-bold text-blue-600">x{effectif.nombre}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Autres moyens */}
                  {resources.autresMoyens && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h3 className="font-semibold text-gray-700 mb-2">Autres moyens</h3>
                      <p className="text-gray-600">{resources.autresMoyens}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Pièces jointes */}
              {rex.attachments && rex.attachments.length > 0 && (
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Paperclip className="h-4 w-4 text-gray-600" />
                    </div>
                    Pièces jointes ({rex.attachments.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rex.attachments.map((attachment: { id: string; name: string; url: string; type: string; size: number }) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                          {attachment.type.startsWith('image/') ? (
                            <FileText className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                          <p className="text-xs text-gray-500">
                            {(attachment.size / 1024).toFixed(1)} Ko
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Commentaires */}
              <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </div>
                  Commentaires ({rex.comments?.length || 0})
                </h2>

                {!rex.comments || rex.comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucun commentaire pour le moment</p>
                ) : (
                  <div className="space-y-4">
                    {rex.comments.map((comment: { id: string; content: string; created_at: string; author?: { id: string; name: string; rank?: string } }) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {comment.author?.name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="font-semibold text-gray-900">{comment.author?.name}</span>
                                {comment.author?.rank && (
                                  <span className="text-gray-500 text-sm ml-2">({comment.author.rank})</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Auteur */}
              <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Auteur
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                    {rex.author?.name?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{rex.author?.name}</p>
                    {rex.author?.rank && (
                      <p className="text-sm text-gray-500">{rex.author.rank}</p>
                    )}
                    {rex.author?.unit && (
                      <p className="text-sm text-gray-500">{rex.author.unit}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Organisation */}
              <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  Organisation
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">SDIS</p>
                    <p className="font-medium text-gray-900">{rex.sdis?.name || rex.sdis?.code}</p>
                  </div>
                  {rex.sdis?.department && (
                    <div>
                      <p className="text-sm text-gray-500">Département</p>
                      <p className="font-medium text-gray-900">{rex.sdis.department}</p>
                    </div>
                  )}
                  {rex.sdis?.region && (
                    <div>
                      <p className="text-sm text-gray-500">Région</p>
                      <p className="font-medium text-gray-900">{rex.sdis.region}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Visibilité */}
              <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Visibilité</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getVisibilityIcon(rex.visibility || 'PRIVE')}</span>
                  <span className="font-medium text-gray-700">{getVisibilityLabel(rex.visibility || 'PRIVE')}</span>
                </div>
              </section>

              {/* Tags */}
              {tags.length > 0 && (
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: { id: string; name: string }) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Dates */}
              <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Dates
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Intervention</span>
                    <span className="font-medium text-gray-900">{formatDate(rex.intervention_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Créé le</span>
                    <span className="font-medium text-gray-900">{formatDate(rex.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modifié le</span>
                    <span className="font-medium text-gray-900">{formatDate(rex.updated_at)}</span>
                  </div>
                  {rex.validated_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Validé le</span>
                      <span className="font-medium text-green-600">{formatDate(rex.validated_at)}</span>
                    </div>
                  )}
                  {rex.validated_by && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Validé par</span>
                      <span className="font-medium text-gray-900">{rex.validated_by.name}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Raison du rejet */}
              {rex.status === 'REJETE' && rex.rejection_reason && (
                <section className="bg-red-50 rounded-xl border border-red-200 p-6">
                  <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Raison du rejet
                  </h3>
                  <p className="text-red-700 text-sm">{rex.rejection_reason}</p>
                </section>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Composant pour les sections de contenu
function ContentSection({
  icon,
  title,
  content,
  color,
}: {
  icon: React.ReactNode
  title: string
  content: string
  color: 'blue' | 'indigo' | 'orange' | 'green' | 'purple' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    orange: 'bg-orange-100 text-orange-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClasses[color])}>
          {icon}
        </div>
        {title}
      </h2>
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </section>
  )
}
