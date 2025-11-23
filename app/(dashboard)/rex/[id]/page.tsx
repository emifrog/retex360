import * as React from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  formatDate,
  getTypeLabel,
  getTypeColor,
  getSeverityLabel,
  getSeverityColor,
  getStatusLabel,
  getStatusColor,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { RexWithDetails } from '@/lib/types/rex'

interface PageProps {
  params: {
    id: string
  }
}

export default async function RexDetailPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user || !user.sdisId) {
    redirect('/login')
  }

  const rex = (await prisma.rEX.findUnique({
    where: {
      id: params.id,
      sdisId: user.sdisId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      comments: {
        include: {
          author: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      attachments: true,
      sdis: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  })) as RexWithDetails | null

  if (!rex) {
    notFound()
  }

  await prisma.rEX.update({
    where: { id: params.id },
    data: { views: { increment: 1 } },
  })

  return (
    <div>
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
            {user.id === rex.authorId && (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter PDF
            </Button>
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Partager
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-8">
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

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{rex.title}</h1>

          <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
            <InfoBadge
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              Par <strong>{rex.author.name}</strong>
            </InfoBadge>
            <InfoBadge
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            >
              {formatDate(rex.interventionDate)}
            </InfoBadge>
            <InfoBadge
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              }
            >
              {rex.location}
            </InfoBadge>
            <InfoBadge
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
            >
              {rex.views} vues
            </InfoBadge>
          </div>

          <div className="flex flex-wrap gap-2">
            {rex.tags.map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {rex.aiSummary && (
          <div className="bg-linear-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">Résumé IA</h3>
                <p className="text-gray-700 leading-relaxed">{rex.aiSummary}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <ContentSection icon="ℹ️" title="Contexte" content={rex.context} />
          <ContentSection icon="🔥" title="Actions menées" content={rex.actions} />
          <ContentSection icon="✅" title="Résultat" content={rex.outcome} />
          <ContentSection icon="🎓" title="Leçons apprises" content={rex.lessons} />
          <ContentSection icon="💡" title="Recommandations" content={rex.recommendations} />
        </div>

        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Commentaires ({rex.comments.length})
          </h2>

          {rex.comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun commentaire pour le moment</p>
          ) : (
            <div className="space-y-4">
              {rex.comments.map((comment: RexWithDetails['comments'][number]) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                    {comment.author.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{comment.author.name}</span>
                        <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{comment.content}</p>
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

function InfoBadge({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      {icon}
      <span>{children}</span>
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
