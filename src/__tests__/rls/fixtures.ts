/**
 * Miroir TypeScript de supabase/test/seed.sql.
 *
 * La cohérence des deux fichiers est vérifiée par `seed.rls.test.ts` : toute
 * dérive fait échouer les tests plutôt que de les rendre silencieusement
 * vacuants (une requête sur un UUID inexistant renvoie 0 ligne, ce qui
 * ressemble beaucoup à « la RLS a bien bloqué »).
 */

export const SDIS_A = 'a0000000-0000-4000-a000-000000000001'; // SDIS 06
export const SDIS_B = 'a0000000-0000-4000-a000-000000000002'; // SDIS 13

export const USER_A = { id: 'c0000000-0000-4000-a000-0000000000a1', email: 'user.a@sdis06.fr' };
export const VALIDATOR_A = {
  id: 'c0000000-0000-4000-a000-0000000000a2',
  email: 'validator.a@sdis06.fr',
};
export const ADMIN_A = { id: 'c0000000-0000-4000-a000-0000000000a3', email: 'admin.a@sdis06.fr' };
export const USER_B = { id: 'c0000000-0000-4000-a000-0000000000b1', email: 'user.b@sdis13.fr' };
export const ADMIN_B = { id: 'c0000000-0000-4000-a000-0000000000b3', email: 'admin.b@sdis13.fr' };
export const SUPER_ADMIN = {
  id: 'c0000000-0000-4000-a000-0000000000f0',
  email: 'super@retex360.fr',
};
export const DEMO = { id: 'c0000000-0000-4000-a000-0000000000d0', email: 'demo@retex360.fr' };

export const REX_A_VALIDATED_SDIS = 'e0000000-0000-4000-a000-0000000000a1';
export const REX_A_VALIDATED_INTER = 'e0000000-0000-4000-a000-0000000000a2';
export const REX_A_PENDING = 'e0000000-0000-4000-a000-0000000000a3';
export const REX_A_DRAFT = 'e0000000-0000-4000-a000-0000000000a4';
export const REX_B_VALIDATED_SDIS = 'e0000000-0000-4000-a000-0000000000b1';
export const REX_B_VALIDATED_INTER = 'e0000000-0000-4000-a000-0000000000b2';
export const REX_B_PENDING = 'e0000000-0000-4000-a000-0000000000b3';
export const REX_B_DRAFT = 'e0000000-0000-4000-a000-0000000000b4';

export const COMMENT_A = 'f0000000-0000-4000-a000-0000000000a1';
export const COMMENT_B = 'f0000000-0000-4000-a000-0000000000b1';

export const ATTACHMENT_A = '90000000-0000-4000-a000-0000000000a1';
export const ATTACHMENT_B = '90000000-0000-4000-a000-0000000000b1';
export const ATTACHMENT_STAGED = '90000000-0000-4000-a000-0000000000a9';

export const ALL_REX = [
  REX_A_VALIDATED_SDIS,
  REX_A_VALIDATED_INTER,
  REX_A_PENDING,
  REX_A_DRAFT,
  REX_B_VALIDATED_SDIS,
  REX_B_VALIDATED_INTER,
  REX_B_PENDING,
  REX_B_DRAFT,
];
