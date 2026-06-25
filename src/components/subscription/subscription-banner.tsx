import { Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubscriptionState } from '@/lib/subscription';

/**
 * Bannière d'abonnement affichée en haut du dashboard.
 * - trial    : rappel de fin de période d'essai (accès complet).
 * - readonly : abonnement suspendu/expiré, écritures bloquées (lecture seule).
 * Les modes `active` et `blocked` ne rendent rien (blocked => redirection).
 */
export function SubscriptionBanner({ state }: { state: SubscriptionState }) {
  if (state.mode === 'trial') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
        )}
        role="status"
      >
        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          <strong>Période d&apos;essai en cours.</strong>{' '}
          {state.daysLeft !== null
            ? `Il vous reste ${state.daysLeft} jour${state.daysLeft > 1 ? 's' : ''} d'essai.`
            : "Votre période d'essai est active."}{' '}
          Contactez votre référent pour activer votre abonnement.
        </p>
      </div>
    );
  }

  if (state.mode === 'readonly') {
    const reason =
      state.status === 'suspended'
        ? state.suspendedReason
          ? `Abonnement suspendu (${state.suspendedReason}).`
          : 'Abonnement suspendu.'
        : 'Abonnement expiré.';
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
          'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400'
        )}
        role="alert"
      >
        <Lock className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          <strong>Mode lecture seule.</strong> {reason} La création et la modification de contenu
          sont désactivées
          {state.daysLeft !== null
            ? ` — accès en lecture maintenu encore ${state.daysLeft} jour${state.daysLeft > 1 ? 's' : ''}.`
            : '.'}{' '}
          Contactez votre référent SDIS pour régulariser.
        </p>
      </div>
    );
  }

  return null;
}
