import { Zap, FileText, ClipboardList, Lock, Share2, Globe } from 'lucide-react';
import type { ProductionType, Visibility } from '@/types';

/**
 * Teintes de badge : fond léger, texte foncé en thème clair et clair en thème
 * sombre.
 *
 * Le texte utilisait la nuance 500 dans les deux thèmes. Sur fond clair, elle
 * donnait 1,8:1 (jaune) à 3,3:1 (rouge), pour 4,5:1 exigé par le RGAA.
 * `badge-contrast.test.ts` calcule le contraste de chaque teinte sur les fonds
 * réels des deux thèmes : une nuance changée ici sans y penser fait échouer la
 * suite.
 */
export const BADGE_TONES = {
  red: {
    text: 'text-red-800 dark:text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  orange: {
    text: 'text-orange-800 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  yellow: {
    text: 'text-yellow-800 dark:text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  amber: {
    text: 'text-amber-800 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  green: {
    text: 'text-green-800 dark:text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  blue: {
    text: 'text-blue-800 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  gray: {
    text: 'text-gray-800 dark:text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

/** Les trois classes d'une teinte, pour un `className` de badge. */
export function badgeClasses(tone: BadgeTone): string {
  const t = BADGE_TONES[tone];
  return `${t.bg} ${t.text} ${t.border}`;
}

// --- Severity ---

export const SEVERITY_CONFIG = {
  critique: {
    label: 'Critique',
    tone: 'red',
    color: 'bg-red-500',
    textColor: BADGE_TONES.red.text,
    bgColor: BADGE_TONES.red.bg,
    borderColor: BADGE_TONES.red.border,
    hex: '#ef4444',
  },
  majeur: {
    label: 'Majeur',
    tone: 'orange',
    color: 'bg-orange-500',
    textColor: BADGE_TONES.orange.text,
    bgColor: BADGE_TONES.orange.bg,
    borderColor: BADGE_TONES.orange.border,
    hex: '#f97316',
  },
  significatif: {
    label: 'Significatif',
    tone: 'yellow',
    color: 'bg-yellow-500',
    textColor: BADGE_TONES.yellow.text,
    bgColor: BADGE_TONES.yellow.bg,
    borderColor: BADGE_TONES.yellow.border,
    hex: '#eab308',
  },
} as const;

export type SeverityKey = keyof typeof SEVERITY_CONFIG;

// --- Production Type ---

export const PRODUCTION_TYPE_CONFIG: Record<
  ProductionType,
  {
    label: string;
    icon: typeof Zap;
    tone: BadgeTone;
    className: string;
  }
> = {
  signalement: {
    label: 'Signalement',
    icon: Zap,
    tone: 'gray',
    className: badgeClasses('gray'),
  },
  pex: {
    label: 'PEX',
    icon: FileText,
    tone: 'blue',
    className: badgeClasses('blue'),
  },
  retex: {
    label: 'RETEX',
    icon: ClipboardList,
    tone: 'amber',
    className: badgeClasses('amber'),
  },
};

// --- Status ---

export const STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    tone: 'gray',
    className: badgeClasses('gray'),
  },
  pending: {
    label: 'En attente',
    tone: 'orange',
    className: badgeClasses('orange'),
  },
  validated: {
    label: 'Validé',
    tone: 'green',
    className: badgeClasses('green'),
  },
  archived: {
    label: 'Archivé',
    tone: 'gray',
    className: badgeClasses('gray'),
  },
} as const;

export type StatusKey = keyof typeof STATUS_CONFIG;

// --- Visibility ---

/** Libellés du formulaire, du point de vue de l'auteur. */
export const VISIBILITY_LABELS = {
  sdis: 'Mon SDIS uniquement',
  inter_sdis: 'Tous les SDIS',
  public: 'Public',
} as const;

/**
 * Visibilité telle qu'on la montre au lecteur et au validateur.
 *
 * Libellés distincts de ceux du formulaire : « Mon SDIS » n'a de sens que pour
 * l'auteur, alors que la fiche est aussi lue par un validateur ou un
 * super-administrateur d'un autre SDIS.
 *
 * `inter_sdis` et `public` ouvrent le REX aux mêmes lecteurs — tout agent
 * connecté, une fois le REX validé (policy de la migration 013). Les deux
 * descriptions le disent de la même façon.
 */
export const VISIBILITY_CONFIG: Record<
  Visibility,
  { label: string; shortLabel: string; description: string; icon: typeof Lock; tone: BadgeTone }
> = {
  sdis: {
    label: 'Réservé au SDIS',
    shortLabel: 'SDIS seul',
    description: 'Visible des seuls agents du SDIS auteur.',
    icon: Lock,
    tone: 'gray',
  },
  inter_sdis: {
    label: 'Partagé à tous les SDIS',
    shortLabel: 'Tous les SDIS',
    description: 'Une fois validé, visible des agents de tous les SDIS.',
    icon: Share2,
    tone: 'blue',
  },
  public: {
    label: 'Public',
    shortLabel: 'Public',
    description: 'Une fois validé, visible des agents de tous les SDIS.',
    icon: Globe,
    tone: 'blue',
  },
};
