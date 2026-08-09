import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, migrationFiles } from './harness';
import { ALL_REX, SDIS_A, SDIS_B, USER_A, USER_B, ADMIN_A, ADMIN_B, SUPER_ADMIN } from './fixtures';

/**
 * Vérifie que le harnais lui-même est sain AVANT de conclure quoi que ce soit
 * des autres suites. Une base mal amorcée ferait passer tous les tests
 * d'isolation : « 0 ligne » ressemble à « la RLS a bloqué » alors que ce serait
 * simplement « la donnée n'existe pas ».
 */
describe('Harnais RLS', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await db?.close();
  });

  it('applique toutes les migrations du dépôt', async () => {
    // Si une migration est ajoutée sans que le harnais tourne, on veut le savoir.
    expect(migrationFiles().length).toBeGreaterThanOrEqual(21);
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`
    );
    expect(rows[0].n).toBeGreaterThan(0);
  });

  it('a bien la RLS activée sur toutes les tables métier', async () => {
    const { rows } = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND NOT rowsecurity
       ORDER BY tablename`
    );
    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it('contient les fixtures attendues (pas de dérive seed.sql / fixtures.ts)', async () => {
    const rex = await db.query<{ id: string }>(`SELECT id FROM rex WHERE id = ANY($1::uuid[])`, [
      ALL_REX,
    ]);
    expect(rex.rows).toHaveLength(ALL_REX.length);

    const users = [USER_A, USER_B, ADMIN_A, ADMIN_B, SUPER_ADMIN].map((u) => u.id);
    const profiles = await db.query<{ id: string }>(
      `SELECT id FROM profiles WHERE id = ANY($1::uuid[])`,
      [users]
    );
    expect(profiles.rows).toHaveLength(users.length);

    const sdis = await db.query<{ id: string }>(`SELECT id FROM sdis WHERE id = ANY($1::uuid[])`, [
      [SDIS_A, SDIS_B],
    ]);
    expect(sdis.rows).toHaveLength(2);
  });

  it('place les deux SDIS de test sur des tenants distincts', async () => {
    const { rows } = await db.query<{ sdis_id: string; n: number }>(
      `SELECT sdis_id, count(*)::int AS n FROM rex GROUP BY sdis_id ORDER BY sdis_id`
    );
    const bySdis = Object.fromEntries(rows.map((r) => [r.sdis_id, r.n]));
    expect(bySdis[SDIS_A]).toBe(4);
    expect(bySdis[SDIS_B]).toBe(4);
  });
});
