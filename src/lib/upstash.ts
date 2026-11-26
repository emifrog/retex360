import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

/**
 * Accès à Upstash Redis pour les limiteurs de débit, borné en durée.
 *
 * Le limiteur est sur le chemin de CHAQUE appel d'API, deux fois : dans le
 * middleware puis dans la route. Sa panne ne doit donc jamais coûter plus que
 * ce qu'elle protège.
 *
 * Avec les réglages par défaut du client, ce n'était pas le cas. Quand la base
 * Redis a disparu (novembre 2026), le client réessayait cinq fois avec un délai
 * croissant — 4,3 s — avant d'abandonner : 9 secondes ajoutées à chaque
 * requête, pendant des semaines. Et comme les `catch` étaient vides, rien ne
 * l'a signalé.
 */

/** Délai au-delà duquel un limiteur rend la main sans avoir compté. */
export const LIMITER_TIMEOUT_MS = 1000;

/** Une seule reprise, rapprochée : de quoi absorber un accroc réseau, pas une panne. */
const REDIS_RETRY = { retries: 1, backoff: () => 100 };

export function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Client Redis borné, ou `null` si Upstash n'est pas configuré. */
export function createRedis(): Redis | null {
  if (!isUpstashConfigured()) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    retry: REDIS_RETRY,
  });
}

const REPORT_INTERVAL_MS = 60_000;
let lastReportAt = 0;

/**
 * Signale que le limiteur n'a pas pu compter — au plus une fois par minute et
 * par instance.
 *
 * Sans plafond, une panne produirait une erreur par requête : le signal se
 * noierait dans son propre volume et épuiserait le quota du collecteur.
 */
export function reportLimiterFailure(scope: string, error: unknown): void {
  const now = Date.now();
  if (now - lastReportAt < REPORT_INTERVAL_MS) return;
  lastReportAt = now;
  logger.error('Limiteur de débit injoignable (Upstash Redis)', {
    scope,
    error: error instanceof Error ? error.message : String(error),
  });
}

/** Réarme le signalement. Réservé aux tests. */
export function resetLimiterFailureReport(): void {
  lastReportAt = 0;
}
