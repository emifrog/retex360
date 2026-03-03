import { Zap, FileText, ClipboardList } from 'lucide-react';
import type { ProductionType } from '@/types';

// --- Severity ---

export const SEVERITY_CONFIG = {
  critique: {
    label: 'Critique',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    hex: '#ef4444',
  },
  majeur: {
    label: 'Majeur',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    hex: '#f97316',
  },
  significatif: {
    label: 'Significatif',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    hex: '#eab308',
  },
} as const;

export type SeverityKey = keyof typeof SEVERITY_CONFIG;

// --- Production Type ---

export const PRODUCTION_TYPE_CONFIG: Record<ProductionType, {
  label: string;
  icon: typeof Zap;
  className: string;
}> = {
  signalement: {
    label: 'Signalement',
    icon: Zap,
    className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30',
  },
  pex: {
    label: 'PEX',
    icon: FileText,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  retex: {
    label: 'RETEX',
    icon: ClipboardList,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
};

// --- Status ---

export const STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  },
  pending: {
    label: 'En attente',
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  },
  validated: {
    label: 'Validé',
    className: 'bg-green-500/10 text-green-500 border-green-500/30',
  },
  archived: {
    label: 'Archivé',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  },
} as const;

export type StatusKey = keyof typeof STATUS_CONFIG;

// --- Visibility ---

export const VISIBILITY_LABELS = {
  sdis: 'Mon SDIS uniquement',
  inter_sdis: 'Tous les SDIS',
  public: 'Public',
} as const;
