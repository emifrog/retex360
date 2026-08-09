import { paginationSchema } from '@/lib/validators/api';

/**
 * `paginationSchema` existait depuis longtemps sans être branché nulle part :
 * `GET /api/rex` et `/api/notifications` passaient `parseInt()` directement à
 * Postgres. Ces tests fixent le contrat maintenant qu'il est utilisé, en
 * particulier la façon dont on doit lui transmettre un paramètre absent.
 */
describe('paginationSchema', () => {
  it("applique les valeurs par défaut quand rien n'est fourni", () => {
    const r = paginationSchema.safeParse({});
    expect(r.success).toBe(true);
    expect(r.success && r.data).toEqual({ page: 1, limit: 10 });
  });

  it('coerce les chaînes issues de la query string', () => {
    const r = paginationSchema.safeParse({ page: '3', limit: '25' });
    expect(r.success && r.data).toEqual({ page: 3, limit: 25 });
  });

  it('plafonne `limit` à 100', () => {
    expect(paginationSchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(paginationSchema.safeParse({ limit: '999999' }).success).toBe(false);
    expect(paginationSchema.safeParse({ limit: '100' }).success).toBe(true);
  });

  it('rejette le non-numérique plutôt que de produire NaN', () => {
    // `parseInt('abc')` donnait NaN, transmis tel quel à `range(NaN, NaN)`.
    expect(paginationSchema.safeParse({ page: 'abc' }).success).toBe(false);
    expect(paginationSchema.safeParse({ limit: 'abc' }).success).toBe(false);
  });

  it('rejette zéro, le négatif et le décimal', () => {
    expect(paginationSchema.safeParse({ page: '0' }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: '-5' }).success).toBe(false);
    expect(paginationSchema.safeParse({ limit: '1.5' }).success).toBe(false);
  });

  it("rejette `null` — d'où le `?? undefined` sur les appels à searchParams.get", () => {
    // `searchParams.get()` renvoie `null` pour un paramètre absent, et la
    // coercion Zod transforme `null` en 0, qui échoue sur `.positive()`.
    // Passer `null` tel quel casserait donc toute requête sans pagination.
    expect(paginationSchema.safeParse({ page: null, limit: null }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: undefined, limit: undefined }).success).toBe(true);
  });

  it('accepte le repli à 20 utilisé par les notifications', () => {
    const r = paginationSchema.safeParse({ limit: '20' });
    expect(r.success && r.data.limit).toBe(20);
  });
});
