import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Harnais de test RLS.
 *
 * Applique le bootstrap Supabase (supabase/test/bootstrap.sql), PUIS les vraies
 * migrations du dépôt, à un Postgres réel (PGlite, PostgreSQL 18 en WASM). Les
 * policies testées sont donc celles qui partiront en production, pas une copie.
 *
 * Pourquoi PGlite plutôt qu'un conteneur : les tests tournent à l'identique en
 * local et en CI, sans Docker. Contrepartie assumée : PGlite est en PostgreSQL 18
 * alors que Supabase est en 15/17. Les mécanismes utilisés ici (RLS, policies
 * RESTRICTIVE, `security_invoker`, triggers, SECURITY DEFINER) sont stables
 * entre ces versions.
 */

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const TEST_DIR = path.join(ROOT, 'supabase', 'test');

/**
 * Migrations non appliquées par le harnais, avec leur raison.
 * Garde-fou : si l'une d'elles se met à contenir une policy, le harnais échoue
 * (cf. `assertSkippableMigration`) — on ne veut pas d'angle mort silencieux.
 */
const SKIPPED_MIGRATIONS = new Map<string, string>([
  [
    '002_semantic_search.sql',
    "pgvector n'est pas disponible sous PGlite ; cette migration ne contient " +
      "qu'une fonction de recherche et un index ivfflat, aucune policy.",
  ],
]);

/**
 * Réécritures appliquées au SQL avant exécution. Volontairement minimales et
 * limitées au type `vector`, qu'aucune policy ne référence.
 */
function preprocess(sql: string): string {
  return sql
    .replace(
      /CREATE EXTENSION IF NOT EXISTS "vector";?/gi,
      '-- [harnais] extension vector : domaine fourni par bootstrap.sql'
    )
    .replace(/\bVECTOR\s*\(\s*\d+\s*\)/gi, 'vector');
}

function assertSkippableMigration(file: string, sql: string): void {
  if (/CREATE\s+POLICY/i.test(sql)) {
    throw new Error(
      `Le harnais RLS ignore ${file}, mais cette migration contient désormais une ` +
        `policy. Retirez-la de SKIPPED_MIGRATIONS et rendez-la applicable, sinon ` +
        `ses règles ne sont testées par personne.`
    );
  }
}

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/** Crée une base neuve : bootstrap + migrations + grants + seed. */
export async function createTestDb(): Promise<PGlite> {
  // `uuid-ossp` est requis par la migration 001.
  const db = new PGlite({ extensions: { uuid_ossp } });

  await db.exec(readFileSync(path.join(TEST_DIR, 'bootstrap.sql'), 'utf8'));

  for (const file of migrationFiles()) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    if (SKIPPED_MIGRATIONS.has(file)) {
      assertSkippableMigration(file, sql);
      continue;
    }
    try {
      await db.exec(preprocess(sql));
    } catch (error) {
      throw new Error(`Migration ${file} échoue sous le harnais : ${(error as Error).message}`);
    }
  }

  await db.exec(readFileSync(path.join(TEST_DIR, 'grants.sql'), 'utf8'));
  await db.exec(readFileSync(path.join(TEST_DIR, 'seed.sql'), 'utf8'));

  return db;
}

export interface TestUser {
  id: string;
  email: string;
}

/**
 * Exécute `fn` avec l'identité de `user` sous le rôle `authenticated`.
 *
 * `user = null` => rôle `anon` (non authentifié). Les claims sont posés par
 * `set_config` paramétré, jamais par interpolation.
 */
export async function asUser<T>(
  db: PGlite,
  user: TestUser | null,
  fn: () => Promise<T>
): Promise<T> {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [user?.id ?? '']);
  await db.query(`SELECT set_config('request.jwt.claims', $1, false)`, [
    user ? JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated' }) : '{}',
  ]);
  await db.exec(`SET ROLE ${user ? 'authenticated' : 'anon'}`);
  try {
    return await fn();
  } finally {
    await db.exec('RESET ROLE');
  }
}

/**
 * Exécute `fn` sous le rôle propriétaire (RLS contournée), pour préparer un
 * état de départ qu'aucun utilisateur de test n'aurait le droit de créer.
 */
export async function asOwner<T>(db: PGlite, fn: () => Promise<T>): Promise<T> {
  await db.exec('RESET ROLE');
  return fn();
}

/** Nombre de lignes renvoyées par une requête, sous l'identité courante. */
export async function rowsFor(db: PGlite, sql: string, params: unknown[] = []): Promise<number> {
  const res = await db.query(sql, params);
  return res.rows.length;
}

/**
 * Joue une écriture et renvoie le nombre de lignes RÉELLEMENT affectées.
 *
 * C'est le cœur de ce que le harnais doit prouver : une écriture refusée par la
 * RLS ne lève PAS d'erreur, elle affecte 0 ligne. Tout code qui ne teste que
 * l'erreur prend ce refus pour un succès — c'est l'origine des régressions des
 * lots 1, 2 et 6.
 */
export async function writeAffecting(
  db: PGlite,
  sql: string,
  params: unknown[] = []
): Promise<number> {
  const res = await db.query(sql, params);
  return res.rows.length;
}

/**
 * Joue une écriture attendue en ÉCHEC et renvoie le message d'erreur (ou null
 * si elle a réussi).
 *
 * Le savepoint n'est pas décoratif : une erreur SQL avorte la transaction
 * courante, et toute commande suivante échouerait en « current transaction is
 * aborted ». Sans lui, le premier test négatif fait tomber tous les suivants.
 *
 * Suppose une transaction ouverte (les suites mutantes encadrent chaque test
 * d'un BEGIN / ROLLBACK).
 */
export async function writeThrows(
  db: PGlite,
  sql: string,
  params: unknown[] = []
): Promise<string | null> {
  await db.exec('SAVEPOINT expect_failure');
  try {
    await db.query(sql, params);
    await db.exec('RELEASE SAVEPOINT expect_failure');
    return null;
  } catch (error) {
    await db.exec('ROLLBACK TO SAVEPOINT expect_failure');
    return (error as Error).message;
  }
}
