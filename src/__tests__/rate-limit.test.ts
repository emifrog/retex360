/**
 * @jest-environment node
 *
 * Tests for the in-memory rate limiter logic.
 * We mock Upstash modules since they use ESM-only dependencies.
 *
 * Environnement `node` (et non jsdom) : `limitByUser`/`limitByIp` construisent
 * une `Response` web, absente du global sous jsdom. Rien ici ne touche au DOM.
 */

// Mock Upstash to avoid ESM import issues
jest.mock('@upstash/ratelimit', () => {
  const MockRatelimit = jest.fn() as jest.Mock & { slidingWindow: jest.Mock };
  MockRatelimit.slidingWindow = jest.fn();
  return { Ratelimit: MockRatelimit };
});
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

// These tests exercise the in-memory limiter, so force that path regardless of
// any local .env Upstash credentials loaded by next/jest. `require` (not
// `import`) runs after these deletes, before the module reads the env.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
/* eslint-disable @typescript-eslint/no-require-imports */
const { rateLimiters, getClientIp, userKey, ipKey, limitByUser, limitByIp } =
  require('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
/* eslint-enable @typescript-eslint/no-require-imports */

describe('Rate limiting', () => {
  describe('getClientIp', () => {
    function mockRequest(headers: Record<string, string> = {}): Request {
      return {
        headers: {
          get: (name: string) => headers[name] || null,
        },
      } as unknown as Request;
    }

    it('extracts IP from x-forwarded-for header', () => {
      const request = mockRequest({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' });
      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('extracts IP from x-real-ip header', () => {
      const request = mockRequest({ 'x-real-ip': '10.0.0.5' });
      expect(getClientIp(request)).toBe('10.0.0.5');
    });

    it('returns unknown when no IP headers present', () => {
      const request = mockRequest();
      expect(getClientIp(request)).toBe('unknown');
    });

    it('prefers x-forwarded-for over x-real-ip', () => {
      const request = mockRequest({
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
      });
      expect(getClientIp(request)).toBe('1.2.3.4');
    });
  });

  describe('auth rate limiter (5 req/min)', () => {
    it('allows requests within the limit', async () => {
      const uniqueIp = `auth-test-${Date.now()}`;
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiters.auth.limit(uniqueIp);
        expect(result.success).toBe(true);
      }
    });

    it('blocks requests exceeding the limit', async () => {
      const uniqueIp = `auth-block-${Date.now()}`;
      for (let i = 0; i < 5; i++) {
        await rateLimiters.auth.limit(uniqueIp);
      }
      const result = await rateLimiters.auth.limit(uniqueIp);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('api rate limiter (60 req/min)', () => {
    it('allows normal usage', async () => {
      const uniqueIp = `api-test-${Date.now()}`;
      const result = await rateLimiters.api.limit(uniqueIp);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(59);
    });
  });

  describe('upload rate limiter (10 req/min)', () => {
    it('allows uploads within limit', async () => {
      const uniqueIp = `upload-test-${Date.now()}`;
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiters.upload.limit(uniqueIp);
        expect(result.success).toBe(true);
      }
    });

    it('blocks excessive uploads', async () => {
      const uniqueIp = `upload-block-${Date.now()}`;
      for (let i = 0; i < 10; i++) {
        await rateLimiters.upload.limit(uniqueIp);
      }
      const result = await rateLimiters.upload.limit(uniqueIp);
      expect(result.success).toBe(false);
    });
  });

  describe('clé de limitation : utilisateur plutôt qu’IP', () => {
    function requestFrom(ip: string): Request {
      return {
        headers: { get: (name: string) => (name === 'x-forwarded-for' ? ip : null) },
      } as unknown as Request;
    }

    it('préfixe les deux espaces de clés', () => {
      expect(userKey('abc')).toBe('u:abc');
      expect(ipKey(requestFrom('192.168.1.1'))).toBe('ip:192.168.1.1');
    });

    it('donne des compteurs indépendants à deux agents du même SDIS', async () => {
      // Le cas que la limitation par IP cassait : même sortie NAT, deux comptes.
      // L'un épuise son quota, l'autre doit rester servi.
      const a = `user-a-${Date.now()}`;
      const b = `user-b-${Date.now()}`;

      for (let i = 0; i < 5; i++) {
        expect(await limitByUser(rateLimiters.auth, a)).toBeNull();
      }
      expect(await limitByUser(rateLimiters.auth, a)).not.toBeNull();
      expect(await limitByUser(rateLimiters.auth, b)).toBeNull();
    });

    it('suit un utilisateur qui change de réseau', async () => {
      // Le quota est attaché au compte : passer du wifi caserne à la 4G ne le
      // remet pas à zéro, ce que la limitation par IP permettait.
      const u = `user-roaming-${Date.now()}`;
      for (let i = 0; i < 5; i++) await limitByUser(rateLimiters.auth, u);
      expect(await limitByUser(rateLimiters.auth, u)).not.toBeNull();
    });

    it('renvoie une 429 avec Retry-After au dépassement, null sinon', async () => {
      const u = `user-429-${Date.now()}`;
      expect(await limitByUser(rateLimiters.auth, u)).toBeNull();

      for (let i = 0; i < 5; i++) await limitByUser(rateLimiters.auth, u);
      const denied = await limitByUser(rateLimiters.auth, u);

      expect(denied).not.toBeNull();
      expect(denied!.status).toBe(429);
      expect(denied!.headers.get('Retry-After')).toBeTruthy();
    });

    it('garde les routes anonymes limitées par IP', async () => {
      const request = requestFrom(`anon-${Date.now()}`);
      for (let i = 0; i < 5; i++) {
        expect(await limitByIp(rateLimiters.auth, request)).toBeNull();
      }
      expect(await limitByIp(rateLimiters.auth, request)).not.toBeNull();
    });

    it("n'entre pas en collision quand un identifiant ressemble à une IP", async () => {
      // Justifie les préfixes : sans eux, ces deux appels partageraient un
      // compteur dans le même espace Redis.
      const value = `10.0.0.${Date.now() % 255}`;
      const request = requestFrom(value);

      for (let i = 0; i < 5; i++) await limitByIp(rateLimiters.auth, request);
      expect(await limitByIp(rateLimiters.auth, request)).not.toBeNull();
      expect(await limitByUser(rateLimiters.auth, value)).toBeNull();
    });
  });

  describe('fail-closed behavior on Redis outage', () => {
    afterEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it('denies sensitive limiters but degrades general ones when Redis is unreachable', async () => {
      // Fresh module with Upstash "configured" but unreachable: the mocked
      // Ratelimit instance has no working .limit(), so every call throws.
      let rl: typeof rateLimiters | undefined;
      jest.isolateModules(() => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        rl = (require('@/lib/rate-limit') as typeof import('@/lib/rate-limit')).rateLimiters;
      });

      // auth + ai are fail-closed: deny on outage to keep protection effective.
      await expect(rl!.auth.limit('fc-auth')).resolves.toMatchObject({ success: false });
      await expect(rl!.ai.limit('fc-ai')).resolves.toMatchObject({ success: false });

      // api is not fail-closed: degrade to the in-memory fallback (allow).
      await expect(rl!.api.limit('fc-api')).resolves.toMatchObject({ success: true });
    });
  });
});
