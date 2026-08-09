/**
 * @jest-environment node
 *
 * `api-auth` importe `next/server`, qui a besoin des globales fetch (Request,
 * Response) absentes de l'environnement jsdom par défaut du projet.
 */
import { isSdisAdmin } from '@/lib/api-auth';
import { toOne } from '@/lib/supabase/relations';

const SDIS_A = '11111111-1111-1111-1111-111111111111';
const SDIS_B = '22222222-2222-2222-2222-222222222222';

describe('isSdisAdmin', () => {
  it('grants a super_admin across every SDIS', () => {
    expect(isSdisAdmin({ role: 'super_admin', sdis_id: SDIS_A }, SDIS_B)).toBe(true);
  });

  it('grants a super_admin even without an SDIS of their own', () => {
    expect(isSdisAdmin({ role: 'super_admin', sdis_id: null }, SDIS_B)).toBe(true);
  });

  it('grants an admin on their own SDIS', () => {
    expect(isSdisAdmin({ role: 'admin', sdis_id: SDIS_A }, SDIS_A)).toBe(true);
  });

  it('denies an admin on another SDIS', () => {
    expect(isSdisAdmin({ role: 'admin', sdis_id: SDIS_A }, SDIS_B)).toBe(false);
  });

  it('denies an admin when the target SDIS is unknown', () => {
    // Two null sdis_id must not compare equal — that would grant an unattached
    // admin access to every unattached resource.
    expect(isSdisAdmin({ role: 'admin', sdis_id: null }, null)).toBe(false);
    expect(isSdisAdmin({ role: 'admin', sdis_id: SDIS_A }, null)).toBe(false);
    expect(isSdisAdmin({ role: 'admin', sdis_id: SDIS_A }, undefined)).toBe(false);
  });

  it('denies non-admin roles even on their own SDIS', () => {
    expect(isSdisAdmin({ role: 'validator', sdis_id: SDIS_A }, SDIS_A)).toBe(false);
    expect(isSdisAdmin({ role: 'user', sdis_id: SDIS_A }, SDIS_A)).toBe(false);
  });

  it('denies a missing profile', () => {
    expect(isSdisAdmin(null, SDIS_A)).toBe(false);
    expect(isSdisAdmin(undefined, SDIS_A)).toBe(false);
  });
});

describe('toOne', () => {
  it('passes an object through (PostgREST runtime shape for a to-one)', () => {
    expect(toOne({ sdis_id: SDIS_A })).toEqual({ sdis_id: SDIS_A });
  });

  it('unwraps a single-element array (supabase-js inferred shape)', () => {
    expect(toOne([{ sdis_id: SDIS_A }])).toEqual({ sdis_id: SDIS_A });
  });

  it('returns null for an empty array', () => {
    expect(toOne([])).toBeNull();
  });

  it('returns null for null/undefined (nullable FK)', () => {
    expect(toOne(null)).toBeNull();
    expect(toOne(undefined)).toBeNull();
  });

  it('feeds isSdisAdmin identically in both shapes', () => {
    const asObject = toOne<{ sdis_id: string | null }>({ sdis_id: SDIS_A });
    const asArray = toOne<{ sdis_id: string | null }>([{ sdis_id: SDIS_A }]);
    const admin = { role: 'admin', sdis_id: SDIS_A };
    expect(isSdisAdmin(admin, asObject?.sdis_id)).toBe(true);
    expect(isSdisAdmin(admin, asArray?.sdis_id)).toBe(true);
  });
});
