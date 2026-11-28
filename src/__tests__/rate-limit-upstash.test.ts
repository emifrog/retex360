/**
 * @jest-environment node
 *
 * Comportement des limiteurs quand Upstash est configuré mais ne répond pas.
 *
 * En novembre 2026, la base Redis a disparu. Le client réessayait cinq fois
 * avec un délai croissant — 4,3 s — et chaque appel d'API passait deux fois par
 * lui : 9 secondes par requête, pendant des semaines, sans une seule trace,
 * parce que les deux `catch` étaient vides.
 */

// Fait de ce fichier un module : sans cela ses constantes de premier niveau
// partagent la portée globale avec celles de `rate-limit.test.ts`.
export {};

const limitMock = jest.fn();
const ratelimitOptions: Array<Record<string, unknown>> = [];
const redisOptions: Array<Record<string, unknown>> = [];

jest.mock('@upstash/ratelimit', () => {
  const MockRatelimit = jest.fn().mockImplementation((options: Record<string, unknown>) => {
    ratelimitOptions.push(options);
    return { limit: limitMock };
  }) as jest.Mock & { slidingWindow: jest.Mock };
  MockRatelimit.slidingWindow = jest.fn();
  return { Ratelimit: MockRatelimit };
});
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation((options: Record<string, unknown>) => {
    redisOptions.push(options);
    return {};
  }),
}));

const errorMock = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: { error: (...args: unknown[]) => errorMock(...args), warn: jest.fn(), info: jest.fn() },
}));

process.env.UPSTASH_REDIS_REST_URL = 'https://exemple.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'jeton-de-test';

/* eslint-disable @typescript-eslint/no-require-imports */
const { rateLimiters } = require('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
const { resetLimiterFailureReport } = require('@/lib/upstash') as typeof import('@/lib/upstash');
/* eslint-enable @typescript-eslint/no-require-imports */

describe('limiteurs avec Upstash configuré', () => {
  beforeEach(() => {
    limitMock.mockReset();
    errorMock.mockReset();
    resetLimiterFailureReport();
  });

  it('chaque limiteur a son propre espace de clés Redis', () => {
    // La bibliothèque compose la clé `préfixe:identifiant:fenêtre`. Avec un
    // préfixe commun, deux limiteurs de même fenêtre partagent le compteur
    // d'un même utilisateur, quel que soit leur plafond.
    const prefixes = ratelimitOptions.map((options) => options.prefix);
    expect(prefixes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  describe('une panne ne doit pas coûter des secondes', () => {
    it('le client Redis ne réessaie pas plus d’une fois', () => {
      expect(redisOptions.length).toBeGreaterThan(0);
      for (const options of redisOptions) {
        const retry = options.retry as { retries?: number } | undefined;
        expect(retry?.retries).toBeLessThanOrEqual(1);
      }
    });

    it('chaque limiteur rend la main en une seconde au plus', () => {
      expect(ratelimitOptions.length).toBeGreaterThan(0);
      for (const options of ratelimitOptions) {
        expect(options.timeout).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('quand Redis lève une erreur', () => {
    beforeEach(() => {
      limitMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND exemple.upstash.io'));
    });

    it('un limiteur ordinaire laisse passer, sur le compteur local', async () => {
      const result = await rateLimiters.api.limit('u:panne-api');
      expect(result.success).toBe(true);
    });

    it('un limiteur sensible refuse', async () => {
      const result = await rateLimiters.auth.limit('ip:panne-auth');
      expect(result.success).toBe(false);
    });

    it('la panne est journalisée', async () => {
      await rateLimiters.api.limit('u:panne-journal');
      expect(errorMock).toHaveBeenCalledTimes(1);
      expect(String(errorMock.mock.calls[0][0])).toMatch(/limiteur/i);
    });

    it('elle n’est pas journalisée à chaque requête', async () => {
      for (let i = 0; i < 20; i++) await rateLimiters.api.limit(`u:rafale-${i}`);
      expect(errorMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('quand Redis ne répond pas dans le délai', () => {
    // La bibliothèque ne lève pas dans ce cas : elle rend `success: true` avec
    // `reason: 'timeout'`. Sans traitement, un limiteur sensible laisserait
    // donc tout passer précisément quand il ne peut plus compter.
    beforeEach(() => {
      limitMock.mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 5,
        reset: Date.now() + 60_000,
        reason: 'timeout',
      });
    });

    it('un limiteur sensible refuse', async () => {
      const result = await rateLimiters.ai.limit('u:delai-ia');
      expect(result.success).toBe(false);
    });

    it('un limiteur ordinaire laisse passer et le signale', async () => {
      const result = await rateLimiters.search.limit('u:delai-recherche');
      expect(result.success).toBe(true);
      expect(errorMock).toHaveBeenCalledTimes(1);
    });
  });

  it('quand Redis répond, sa décision est suivie telle quelle', async () => {
    limitMock.mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: 123 });
    const result = await rateLimiters.auth.limit('ip:nominal');
    expect(result).toMatchObject({ success: false, remaining: 0, reset: 123 });
    expect(errorMock).not.toHaveBeenCalled();
  });
});
