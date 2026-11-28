/**
 * @jest-environment node
 *
 * `api-auth` importe `next/server`, qui a besoin des globales fetch (Request,
 * Response) absentes de l'environnement jsdom par défaut du projet.
 */
import { canChangeRole, isSdisAdmin } from '@/lib/api-auth';
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

/**
 * Qui peut changer le rôle de qui.
 *
 * La route vérifiait le rôle DEMANDÉ et le SDIS de la cible, jamais le rôle
 * ACTUEL de la cible : un admin de SDIS pouvait rétrograder un super_admin
 * rattaché à son SDIS.
 */
describe('canChangeRole', () => {
  const admin = { id: 'admin-a', role: 'admin', sdis_id: SDIS_A };
  const superAdmin = { id: 'super', role: 'super_admin', sdis_id: SDIS_A };
  const agent = { id: 'agent-a', role: 'user', sdis_id: SDIS_A };

  it('un admin promeut un agent de son SDIS', () => {
    expect(canChangeRole(admin, agent, 'validator')).toEqual({ ok: true });
  });

  it("un admin ne touche pas à un agent d'un autre SDIS", () => {
    const result = canChangeRole(admin, { ...agent, sdis_id: SDIS_B }, 'validator');
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('un admin ne peut pas nommer un super_admin', () => {
    expect(canChangeRole(admin, agent, 'super_admin')).toMatchObject({ ok: false, status: 403 });
  });

  it('un admin ne peut pas rétrograder un super_admin, même rattaché à son SDIS', () => {
    const target = { id: 'super-2', role: 'super_admin', sdis_id: SDIS_A };
    expect(canChangeRole(admin, target, 'user')).toMatchObject({ ok: false, status: 403 });
  });

  it('un super_admin modifie un autre super_admin, dans tout SDIS', () => {
    const target = { id: 'super-2', role: 'super_admin', sdis_id: SDIS_B };
    expect(canChangeRole(superAdmin, target, 'admin')).toEqual({ ok: true });
  });

  it('personne ne modifie son propre rôle', () => {
    expect(canChangeRole(superAdmin, superAdmin, 'user')).toMatchObject({ ok: false, status: 400 });
  });

  it("un rôle sans droit d'administration ne change rien", () => {
    const validator = { id: 'val-a', role: 'validator', sdis_id: SDIS_A };
    expect(canChangeRole(validator, agent, 'validator')).toMatchObject({ ok: false, status: 403 });
  });
});
