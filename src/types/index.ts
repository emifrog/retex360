export * from './database';

// REX Types
export const REX_TYPES = [
  'Incendie urbain',
  'Incendie industriel',
  'FDF',
  'SAV',
  'NRBC',
  'AVP',
  'Sauvetage déblaiement',
  'Secours en montagne',
  'Secours nautique',
  'Autre',
] as const;

export type RexType = (typeof REX_TYPES)[number];

// Severity
export const SEVERITIES = ['critique', 'majeur', 'significatif'] as const;
export type Severity = (typeof SEVERITIES)[number];

// Status
export const STATUSES = ['draft', 'pending', 'validated', 'archived'] as const;
export type Status = (typeof STATUSES)[number];

// Visibility
export const VISIBILITIES = ['sdis', 'inter_sdis', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

// User roles
export const ROLES = ['user', 'validator', 'admin', 'super_admin'] as const;
export type Role = (typeof ROLES)[number];

// ============================================================================
// DGSCGC - Mémento septembre 2022
// ============================================================================

// Production Types (Workflow à 3 niveaux)
export const PRODUCTION_TYPES = ['signalement', 'pex', 'retex'] as const;
export type ProductionType = (typeof PRODUCTION_TYPES)[number];

// Focus Thématique Interface
export interface FocusThematique {
  id: string;
  theme: string;
  problematique: string;
  actions_menees: string;
  axes_amelioration: string;
  // Champs additionnels pour l'Annexe F DGSCGC
  constats?: string;
  points_forts?: string;
  points_amelioration?: string;
  propositions?: string;
}

// Thèmes prédéfinis pour les focus (Annexe F du mémento DGSCGC)
export const THEMES_FOCUS = [
  'Soutien Sanitaire Opérationnel (SSO)',
  'Gestion incendie',
  'Sauvetage des victimes',
  'Alimentation en eau',
  'Commandement',
  'Transmissions',
  'Logistique',
  'Relations interservices',
  'Autre',
] as const;

export type ThemeFocus = (typeof THEMES_FOCUS)[number];

// Configuration des types de production
export const PRODUCTION_TYPE_CONFIG = {
  signalement: {
    label: 'Fiche de signalement',
    shortLabel: 'Signalement',
    description: 'Remontée rapide d\'un événement opérationnel',
    color: 'gray',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-300 dark:border-gray-600',
    icon: 'Zap',
    delai: 'Immédiat',
    requiredFields: ['title', 'intervention_date', 'type', 'description'],
  },
  pex: {
    label: 'Partage d\'Expérience',
    shortLabel: 'PEX',
    description: 'Synthèse factuelle et diffusable (max 4 pages)',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-600',
    icon: 'FileText',
    delai: '< 3 mois',
    requiredFields: ['title', 'intervention_date', 'type', 'description', 'context', 'means_deployed', 'lessons_learned'],
  },
  retex: {
    label: 'Retour d\'Expérience',
    shortLabel: 'RETEX',
    description: 'Analyse complète avec plan d\'actions',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-600',
    icon: 'ClipboardList',
    delai: '6-12 mois',
    requiredFields: ['title', 'intervention_date', 'type', 'description', 'context', 'means_deployed', 'lessons_learned', 'focus_thematiques'],
  },
} as const;

// ============================================================================
// Chiffres clés de l'intervention
// ============================================================================

export interface BilanHumain {
  victimes_decedees?: number;
  victimes_urgence_absolue?: number;
  victimes_urgence_relative?: number;
  impliques?: number;
}

export interface KeyFigures {
  nb_sp_engages?: number;
  duree_intervention?: string;
  nb_vehicules?: number;
  bilan_humain?: BilanHumain;
  sdis_impliques?: string[];
  surface_sinistree?: string;
  nb_personnes_evacuees?: number;
  nb_lances?: number;
  debit_eau?: string;
}

// ============================================================================
// Timeline chronologique
// ============================================================================

export const TIMELINE_EVENT_TYPES = [
  'alerte',
  'arrivee',
  'action',
  'message_radio',
  'fin',
  'autre',
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const TIMELINE_EVENT_CONFIG = {
  alerte: { label: 'Alerte', icon: 'Bell', color: 'text-red-500', bgColor: 'bg-red-500' },
  arrivee: { label: 'Arrivée', icon: 'MapPin', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  action: { label: 'Action', icon: 'Zap', color: 'text-amber-500', bgColor: 'bg-amber-500' },
  message_radio: { label: 'Message radio', icon: 'Radio', color: 'text-purple-500', bgColor: 'bg-purple-500' },
  fin: { label: 'Fin', icon: 'CheckCircle', color: 'text-green-500', bgColor: 'bg-green-500' },
  autre: { label: 'Autre', icon: 'Circle', color: 'text-gray-500', bgColor: 'bg-gray-500' },
} as const;

export interface TimelineEvent {
  id: string;
  heure: string;
  titre: string;
  description?: string;
  type: TimelineEventType;
}

// ============================================================================
// Prescriptions catégorisées
// ============================================================================

export const PRESCRIPTION_CATEGORIES = [
  'operations',
  'prevention',
  'formation',
  'technique',
  'autre',
] as const;

export type PrescriptionCategory = (typeof PRESCRIPTION_CATEGORIES)[number];

export const PRESCRIPTION_CATEGORY_CONFIG = {
  operations: { label: 'Opérations', icon: 'Target', color: 'text-red-600', bgColor: 'bg-red-500/10' },
  prevention: { label: 'Prévention-Prévision', icon: 'Shield', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  formation: { label: 'Formation', icon: 'GraduationCap', color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  technique: { label: 'Technique', icon: 'Wrench', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  autre: { label: 'Autre', icon: 'MoreHorizontal', color: 'text-gray-600', bgColor: 'bg-gray-500/10' },
} as const;

export const PRESCRIPTION_STATUSES = ['a_faire', 'en_cours', 'fait'] as const;
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

export const PRESCRIPTION_STATUS_CONFIG = {
  a_faire: { label: 'À faire', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  en_cours: { label: 'En cours', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  fait: { label: 'Fait', color: 'text-green-600', bgColor: 'bg-green-100' },
} as const;

export interface Prescription {
  id: string;
  categorie: PrescriptionCategory;
  description: string;
  responsable?: string;
  echeance?: string;
  statut?: PrescriptionStatus;
}
