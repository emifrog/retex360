import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm">Vue d&apos;ensemble de votre activité REX</p>
          </div>
          <div className="flex items-center space-x-4">
            <input 
              type="text" 
              placeholder="Rechercher un REX..." 
              className="w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
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

      {/* Stats cards */}
      <div className="p-8">
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-green-500 text-sm font-semibold">+12%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">247</div>
            <div className="text-gray-500 text-sm">REX totaux</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-green-500 text-sm font-semibold">+8%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">189</div>
            <div className="text-gray-500 text-sm">Publiés</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-orange-500 text-sm font-semibold">23</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">12</div>
            <div className="text-gray-500 text-sm">En attente</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-green-500 text-sm font-semibold">+45%</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">3.2k</div>
            <div className="text-gray-500 text-sm">Vues ce mois</div>
          </div>
        </div>

        {/* Recent REX */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">REX récents</h2>
            <Link href="/dashboard/rex" className="text-red-600 hover:text-red-700 text-sm font-medium">
              Voir tout →
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">INCIDENT</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">ÉLEVÉ</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">Feu d&apos;appartement avec sauvetage de 3 personnes</h3>
                  <p className="text-sm text-gray-600 mt-1">Nice - 15 novembre 2025</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Il y a 2 jours</div>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>👤 Lt. Martin</span>
                <span>💬 5 commentaires</span>
                <span>👁️ 124 vues</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}