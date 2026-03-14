import * as Sentry from '@sentry/nextjs';
import { randomUUID } from 'crypto';

const isDev = process.env.NODE_ENV === 'development';

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
  return randomUUID().slice(0, 8);
}

function formatLog(entry: LogEntry): string {
  const parts = [
    `[${entry.level.toUpperCase()}]`,
    entry.timestamp,
  ];
  if (entry.correlationId) {
    parts.push(`[${entry.correlationId}]`);
  }
  parts.push(entry.message);
  return parts.join(' ');
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
    case 'info':
      if (isDev) console.log(formatted, data ?? '');
      break;
    case 'warn':
      if (isDev) console.warn(formatted, data ?? '');
      // Send warnings to Sentry as breadcrumbs in production
      if (!isDev) {
        Sentry.addBreadcrumb({
          category: 'app',
          message,
          level: 'warning',
          data: correlationId ? { correlationId, ...(data as object || {}) } : undefined,
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
