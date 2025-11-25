import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Types REX (correspond au schéma SQL: rex_type)
export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INTERVENTION: 'Intervention',
    EXERCICE: 'Exercice',
    FORMATION: 'Formation',
    TECHNIQUE: 'Technique',
    ORGANISATIONNEL: 'Organisationnel',
    AUTRE: 'Autre',
  }
  return labels[type] || type
}

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    INTERVENTION: 'bg-red-100 text-red-700 border-red-200',
    EXERCICE: 'bg-blue-100 text-blue-700 border-blue-200',
    FORMATION: 'bg-purple-100 text-purple-700 border-purple-200',
    TECHNIQUE: 'bg-amber-100 text-amber-700 border-amber-200',
    ORGANISATIONNEL: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    AUTRE: 'bg-gray-100 text-gray-700 border-gray-200',
  }
  return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    INTERVENTION: '🚒',
    EXERCICE: '🎯',
    FORMATION: '📚',
    TECHNIQUE: '🔧',
    ORGANISATIONNEL: '📋',
    AUTRE: '📄',
  }
  return icons[type] || '📄'
}

// Gravité REX (correspond au schéma SQL: rex_gravity)
export function getGravityLabel(gravity: string): string {
  const labels: Record<string, string> = {
    SANS_GRAVITE: 'Sans gravité',
    FAIBLE: 'Faible',
    MODEREE: 'Modérée',
    GRAVE: 'Grave',
    TRES_GRAVE: 'Très grave',
  }
  return labels[gravity] || gravity
}

export function getGravityColor(gravity: string): string {
  const colors: Record<string, string> = {
    SANS_GRAVITE: 'bg-green-100 text-green-700 border-green-200',
    FAIBLE: 'bg-blue-100 text-blue-700 border-blue-200',
    MODEREE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    GRAVE: 'bg-orange-100 text-orange-700 border-orange-200',
    TRES_GRAVE: 'bg-red-100 text-red-700 border-red-200',
  }
  return colors[gravity] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getGravityIcon(gravity: string): string {
  const icons: Record<string, string> = {
    SANS_GRAVITE: '✅',
    FAIBLE: '📗',
    MODEREE: '📙',
    GRAVE: '📕',
    TRES_GRAVE: '🔴',
  }
  return icons[gravity] || '❓'
}

// Alias pour compatibilité (severity -> gravity)
export const getSeverityLabel = getGravityLabel
export const getSeverityColor = getGravityColor

// Catégories REX (correspond au schéma SQL: rex_category)
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    FIRE: 'Incendie',
    RESCUE: 'Secours à personne',
    HAZMAT: 'Matières dangereuses',
    WATER_RESCUE: 'Sauvetage aquatique',
    ROAD_ACCIDENT: 'Accident de la route',
    NATURAL_DISASTER: 'Catastrophe naturelle',
    TECHNICAL: 'Intervention technique',
    OTHER: 'Autre',
  }
  return labels[category] || category
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    FIRE: 'bg-red-100 text-red-700',
    RESCUE: 'bg-blue-100 text-blue-700',
    HAZMAT: 'bg-yellow-100 text-yellow-800',
    WATER_RESCUE: 'bg-cyan-100 text-cyan-700',
    ROAD_ACCIDENT: 'bg-orange-100 text-orange-700',
    NATURAL_DISASTER: 'bg-emerald-100 text-emerald-700',
    TECHNICAL: 'bg-gray-100 text-gray-700',
    OTHER: 'bg-slate-100 text-slate-700',
  }
  return colors[category] || 'bg-gray-100 text-gray-700'
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    FIRE: '🔥',
    RESCUE: '🚑',
    HAZMAT: '☢️',
    WATER_RESCUE: '🌊',
    ROAD_ACCIDENT: '🚗',
    NATURAL_DISASTER: '🌪️',
    TECHNICAL: '🔧',
    OTHER: '📋',
  }
  return icons[category] || '📋'
}

// Statuts REX (correspond au schéma SQL: rex_status)
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    BROUILLON: 'Brouillon',
    EN_ATTENTE: 'En attente',
    VALIDE: 'Validé',
    REJETE: 'Rejeté',
    ARCHIVE: 'Archivé',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    BROUILLON: 'bg-gray-100 text-gray-600 border-gray-200',
    EN_ATTENTE: 'bg-amber-100 text-amber-700 border-amber-200',
    VALIDE: 'bg-green-100 text-green-700 border-green-200',
    REJETE: 'bg-red-100 text-red-700 border-red-200',
    ARCHIVE: 'bg-slate-100 text-slate-500 border-slate-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    BROUILLON: '📝',
    EN_ATTENTE: '⏳',
    VALIDE: '✅',
    REJETE: '❌',
    ARCHIVE: '📦',
  }
  return icons[status] || '📄'
}

// Visibilité REX (correspond au schéma SQL: rex_visibility)
export function getVisibilityLabel(visibility: string): string {
  const labels: Record<string, string> = {
    PRIVE: 'Privé',
    SDIS: 'SDIS',
    REGIONAL: 'Régional',
    NATIONAL: 'National',
  }
  return labels[visibility] || visibility
}

export function getVisibilityColor(visibility: string): string {
  const colors: Record<string, string> = {
    PRIVE: 'bg-gray-100 text-gray-600',
    SDIS: 'bg-blue-100 text-blue-700',
    REGIONAL: 'bg-purple-100 text-purple-700',
    NATIONAL: 'bg-green-100 text-green-700',
  }
  return colors[visibility] || 'bg-gray-100 text-gray-700'
}

export function getVisibilityIcon(visibility: string): string {
  const icons: Record<string, string> = {
    PRIVE: '🔒',
    SDIS: '🏢',
    REGIONAL: '🗺️',
    NATIONAL: '🌍',
  }
  return icons[visibility] || '🔒'
}

// Constantes pour les selects/filtres
export const REX_TYPES = [
  { value: 'INTERVENTION', label: 'Intervention' },
  { value: 'EXERCICE', label: 'Exercice' },
  { value: 'FORMATION', label: 'Formation' },
  { value: 'TECHNIQUE', label: 'Technique' },
  { value: 'ORGANISATIONNEL', label: 'Organisationnel' },
  { value: 'AUTRE', label: 'Autre' },
] as const

export const REX_GRAVITIES = [
  { value: 'SANS_GRAVITE', label: 'Sans gravité' },
  { value: 'FAIBLE', label: 'Faible' },
  { value: 'MODEREE', label: 'Modérée' },
  { value: 'GRAVE', label: 'Grave' },
  { value: 'TRES_GRAVE', label: 'Très grave' },
] as const

export const REX_CATEGORIES = [
  { value: 'FIRE', label: 'Incendie' },
  { value: 'RESCUE', label: 'Secours à personne' },
  { value: 'HAZMAT', label: 'Matières dangereuses' },
  { value: 'WATER_RESCUE', label: 'Sauvetage aquatique' },
  { value: 'ROAD_ACCIDENT', label: 'Accident de la route' },
  { value: 'NATURAL_DISASTER', label: 'Catastrophe naturelle' },
  { value: 'TECHNICAL', label: 'Intervention technique' },
  { value: 'OTHER', label: 'Autre' },
] as const

export const REX_STATUSES = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'VALIDE', label: 'Validé' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'ARCHIVE', label: 'Archivé' },
] as const

export const REX_VISIBILITIES = [
  { value: 'PRIVE', label: 'Privé' },
  { value: 'SDIS', label: 'SDIS' },
  { value: 'REGIONAL', label: 'Régional' },
  { value: 'NATIONAL', label: 'National' },
] as const

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'views', label: 'Plus vus' },
  { value: 'gravity', label: 'Par gravité' },
  { value: 'title', label: 'Alphabétique' },
] as const
