import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';
// Ce module est aussi importé par des composants clients.
const isServer = typeof window === 'undefined';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  data?: unknown;
}

/**
 * Generate a correlation ID for tracing requests across logs.
 * Call once per request and pass it through.
 */
export function createCorrelationId(): string {
  // `globalThis.crypto` et non le module `crypto` de Node : ce fichier est
  // importé par des composants clients, et l'import Node y faisait embarquer
  // un substitut complet de `crypto` pour navigateur (416 Ko) sur toutes les
  // pages connectées. L'API Web existe dans le navigateur, sous Node et sur le
  // runtime edge.
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid.replace(/-/g, '').slice(0, 8);
  // Repli sans exigence de sécurité : l'identifiant ne sert qu'à relier des
  // lignes de journal entre elles.
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

function formatLog(entry: LogEntry): string {
  const parts = [`[${entry.level.toUpperCase()}]`, entry.timestamp];
  if (entry.correlationId) {
    parts.push(`[${entry.correlationId}]`);
  }
  parts.push(entry.message);
  return parts.join(' ');
}

/**
 * Rend une donnée sérialisable : une `Error` devient son nom, son message et sa
 * pile (`JSON.stringify` en ferait `{}`, et la cause disparaîtrait du journal),
 * une référence circulaire est remplacée au lieu de faire lever l'écriture.
 */
function serializable(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[référence circulaire]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => serializable(item, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, serializable(item, seen)])
  );
}

/**
 * Ligne de journal de production : un objet JSON par ligne, que la console de
 * l'hébergeur sait filtrer par champ (niveau, identifiant de corrélation, REX).
 */
function productionLine(entry: LogEntry): string {
  try {
    return JSON.stringify({
      level: entry.level,
      timestamp: entry.timestamp,
      ...(entry.correlationId ? { correlationId: entry.correlationId } : {}),
      message: entry.message,
      ...(entry.data !== undefined ? { data: serializable(entry.data) } : {}),
    });
  } catch {
    // Un journal ne doit jamais faire échouer ce qu'il observe.
    return JSON.stringify({
      level: entry.level,
      timestamp: entry.timestamp,
      message: entry.message,
    });
  }
}

function log(level: LogLevel, message: string, data?: unknown, correlationId?: string) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    correlationId,
    data,
  };

  const formatted = formatLog(entry);

  switch (level) {
    // `info` et `warn` n'écrivaient rien hors développement : le coût des
    // appels au modèle, la durée des PDF et les refus de droits n'apparaissaient
    // dans aucun journal de production.
    //
    // Sur le serveur, tout est écrit. Dans le navigateur, une information reste
    // muette hors développement : elle n'irait que dans la console de
    // l'utilisateur, où personne ne la lit.
    case 'info':
      if (isDev) console.log(formatted, data ?? '');
      else if (isServer) console.log(productionLine(entry));
      break;
    case 'warn':
      if (isDev) console.warn(formatted, data ?? '');
      else
        console.warn(
          isServer ? productionLine(entry) : formatted,
          ...(isServer ? [] : [data ?? ''])
        );
      // Send warnings to Sentry as breadcrumbs in production
      if (!isDev) {
        Sentry.addBreadcrumb({
          category: 'app',
          message,
          level: 'warning',
          data: correlationId ? { correlationId, ...((data as object) || {}) } : undefined,
        });
      }
      break;
    case 'error':
      console.error(formatted, data ?? '');
      // Send errors to Sentry in production
      if (!isDev) {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: {
            correlationId,
            data,
          },
        });
      }
      break;
  }
}

export const logger = {
  info(message: string, ...args: unknown[]) {
    log('info', message, args.length === 1 ? args[0] : args.length > 0 ? args : undefined);
  },

  warn(message: string, ...args: unknown[]) {
    log('warn', message, args.length === 1 ? args[0] : args.length > 0 ? args : undefined);
  },

  error(message: string, ...args: unknown[]) {
    log('error', message, args.length === 1 ? args[0] : args.length > 0 ? args : undefined);
  },

  /**
   * Create a scoped logger with a correlation ID for request tracing.
   * Usage: const log = logger.withCorrelation(); log.info('...');
   */
  withCorrelation(id?: string) {
    const correlationId = id || createCorrelationId();
    return {
      correlationId,
      info: (message: string, data?: unknown) => log('info', message, data, correlationId),
      warn: (message: string, data?: unknown) => log('warn', message, data, correlationId),
      error: (message: string, data?: unknown) => log('error', message, data, correlationId),
    };
  },
};
