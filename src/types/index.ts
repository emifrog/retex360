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
