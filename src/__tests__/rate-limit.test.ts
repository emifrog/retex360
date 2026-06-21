/**
 * Tests for the in-memory rate limiter logic.
 * We mock Upstash modules since they use ESM-only dependencies.
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rateLimiters, getClientIp } = require('@/lib/rate-limit') as typeof import('@/lib/rate-limit');

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
