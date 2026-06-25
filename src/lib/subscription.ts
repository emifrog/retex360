import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Plan, SubscriptionStatus } from '@/types';

/**
 * Lecture et interprétation de l'abonnement d'un SDIS (7B).
 *
 * Le statut « effectif » est DÉRIVÉ à la lecture (pas de cron) : un abonnement
 * encore marqué `trial`/`active` mais dont la date est dépassée est traité comme
 * `expired`. À l'expiration, une période de grâce de 30 jours en lecture seule
 * précède le blocage total.
 *
 * L'enforcement des écritures est garanti côté base par les policies RESTRICTIVE
 * (migration 018) ; ce helper sert au mode UI (bannière, redirection, garde des
 * pages/limites) et donne des messages d'erreur lisibles.
 */
export const READONLY_GRACE_DAYS = 30;
const DAY_MS = 86400000;

export type SubscriptionMode = 'active' | 'trial' | 'readonly' | 'blocked';

interface SubscriptionRow {
  plan: Plan;
  status: SubscriptionStatus;
  suspended_reason: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  max_users: number | null;
  max_rex_per_month: number | null;
}

export interface SubscriptionState {
  hasSubscription: boolean;
  plan: Plan | null;
  status: SubscriptionStatus | null;
  effective: SubscriptionStatus | null;
  mode: SubscriptionMode;
  canWrite: boolean;
  trialEndsAt: string | null;
  daysLeft: number | null; // jours restants (essai ou avant blocage en grâce)
  graceEndsAt: string | null; // fin de la période de grâce (lecture seule)
  suspendedReason: string | null;
  maxUsers: number | null;
  maxRexPerMonth: number | null;
}

/** SDIS sans abonnement (référence non onboardée) : accès complet, non géré. */
const UNMANAGED: SubscriptionState = {
  hasSubscription: false,
  plan: null,
  status: null,
  effective: null,
  mode: 'active',
  canWrite: true,
  trialEndsAt: null,
  daysLeft: null,
  graceEndsAt: null,
  suspendedReason: null,
  maxUsers: null,
  maxRexPerMonth: null,
};

function daysBetween(future: number, now: number): number {
  return Math.max(0, Math.ceil((future - now) / DAY_MS));
}

/** Interprète une ligne d'abonnement en état exploitable côté app. */
export function deriveState(sub: SubscriptionRow): SubscriptionState {
  const now = Date.now();
  const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;

  // Statut effectif dérivé.
  let effective: SubscriptionStatus = sub.status;
  if (sub.status === 'trial' && trialEnd !== null && trialEnd < now) effective = 'expired';
  else if (sub.status === 'active' && periodEnd !== null && periodEnd < now) effective = 'expired';

  const base = {
    hasSubscription: true,
    plan: sub.plan,
    status: sub.status,
    effective,
    trialEndsAt: sub.trial_ends_at,
    suspendedReason: sub.suspended_reason,
    maxUsers: sub.max_users,
    maxRexPerMonth: sub.max_rex_per_month,
  };

  if (effective === 'active') {
    return { ...base, mode: 'active', canWrite: true, daysLeft: null, graceEndsAt: null };
  }
  if (effective === 'trial') {
    return {
      ...base,
      mode: 'trial',
      canWrite: true,
      daysLeft: trialEnd !== null ? daysBetween(trialEnd, now) : null,
      graceEndsAt: null,
    };
  }
  if (effective === 'suspended') {
    return { ...base, mode: 'readonly', canWrite: false, daysLeft: null, graceEndsAt: null };
  }

  // effective === 'expired' : grâce de 30 j en lecture seule, puis blocage.
  const anchor = sub.status === 'trial' ? trialEnd : periodEnd;
  if (anchor === null) {
    // Expiration manuelle sans date d'ancrage : blocage immédiat.
    return { ...base, mode: 'blocked', canWrite: false, daysLeft: null, graceEndsAt: null };
  }
  const graceEnd = anchor + READONLY_GRACE_DAYS * DAY_MS;
  if (now < graceEnd) {
    return {
      ...base,
      mode: 'readonly',
      canWrite: false,
      daysLeft: daysBetween(graceEnd, now),
      graceEndsAt: new Date(graceEnd).toISOString(),
    };
  }
  return {
    ...base,
    mode: 'blocked',
    canWrite: false,
    daysLeft: null,
    graceEndsAt: new Date(graceEnd).toISOString(),
  };
}

/** Récupère et interprète l'état d'abonnement d'un SDIS (via le rôle service). */
export async function getSubscriptionState(sdisId: string | null | undefined): Promise<SubscriptionState> {
  if (!sdisId) return UNMANAGED;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('subscriptions')
      .select(
        'plan, status, suspended_reason, trial_ends_at, current_period_start, current_period_end, max_users, max_rex_per_month'
      )
      .eq('sdis_id', sdisId)
      .maybeSingle();
    if (!data) return UNMANAGED;
    return deriveState(data as SubscriptionRow);
  } catch (error) {
    // Fail-open : ne jamais bloquer l'app sur une lecture d'abonnement.
    logger.error('Subscription state read error:', error);
    return UNMANAGED;
  }
}
