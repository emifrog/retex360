'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function RexFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }

  const resetFilters = () => {
    router.push('/dashboard/rex')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center space-x-4">
        <div>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            value={searchParams.get('type') || ''}
            onChange={(e) => updateFilter('type', e.target.value)}
          >
            <option value="">Tous les types</option>
            <option value="INCIDENT">Incident</option>
            <option value="ACCIDENT">Accident</option>
            <option value="NEAR_MISS">Presque accident</option>
            <option value="GOOD_PRACTICE">Bonne pratique</option>
            <option value="INNOVATION">Innovation</option>
          </select>
        </div>
        
        <div>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            value={searchParams.get('category') || ''}
            onChange={(e) => updateFilter('category', e.target.value)}
          >
            <option value="">Toutes catégories</option>
            <option value="FIRE">Incendie</option>
            <option value="RESCUE">Secours à personne</option>
            <option value="ROAD_ACCIDENT">Accident route</option>
            <option value="HAZMAT">Matières dangereuses</option>
            <option value="TECHNICAL">Technique</option>
          </select>
        </div>
        
        <div>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            value={searchParams.get('status') || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">Tous statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="IN_REVIEW">En validation</option>
            <option value="PUBLISHED">Publié</option>
          </select>
        </div>
        
        <div>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            value={searchParams.get('sort') || 'recent'}
            onChange={(e) => updateFilter('sort', e.target.value)}
          >
            <option value="recent">Plus récents</option>
            <option value="oldest">Plus anciens</option>
            <option value="views">Plus vus</option>
            <option value="comments">Plus commentés</option>
          </select>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={resetFilters}
          className="ml-auto"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Réinitialiser
        </Button>
      </div>
    </div>
  )
}