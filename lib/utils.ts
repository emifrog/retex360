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

// Ajouter ces fonctions aux utils existants

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INCIDENT: 'Incident',
    ACCIDENT: 'Accident',
    NEAR_MISS: 'Presque accident',
    GOOD_PRACTICE: 'Bonne pratique',
    INNOVATION: 'Innovation',
  }
  return labels[type] || type
}

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    INCIDENT: 'bg-red-100 text-red-700',
    ACCIDENT: 'bg-orange-100 text-orange-700',
    NEAR_MISS: 'bg-yellow-100 text-yellow-700',
    GOOD_PRACTICE: 'bg-green-100 text-green-700',
    INNOVATION: 'bg-blue-100 text-blue-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    LOW: 'Faible',
    MEDIUM: 'Moyen',
    HIGH: 'Élevé',
    CRITICAL: 'Critique',
  }
  return labels[severity] || severity
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
  }
  return colors[severity] || 'bg-gray-100 text-gray-700'
}

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

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Brouillon',
    IN_REVIEW: 'En validation',
    PUBLISHED: 'Publié',
    ARCHIVED: 'Archivé',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    IN_REVIEW: 'bg-orange-100 text-orange-700',
    PUBLISHED: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-gray-100 text-gray-500',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}