import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, asUser, asOwner, sqlThrows, writeAffecting, writeThrows } from './harness';
import { SDIS_A, SDIS_B, USER_A, ADMIN_A, USER_B, ADMIN_B, SUPER_ADMIN, DEMO } from './fixtures';

/**
 * Couvre la migration 019 : l'annuaire n'est plus lisible globalement, et un
 * utilisateur ne peut plus se hisser lui-même en admin ni changer de SDIS.
 */
describe('RLS — table profiles (migration 019)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await db.exec('BEGIN');
  });
  afterEach(async () => {
    await db.exec('ROLLBACK');
  });

  describe('SELECT — annuaire cloisonné', () => {
    it('on voit toujours son propre profil', async () => {
      const { rows } = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM profiles WHERE id = $1`, [USER_A.id])
      );
      expect(rows).toHaveLength(1);
    });

    it('on voit les profils de son SDIS', async () => {
      const { rows } = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM profiles WHERE id = $1`, [ADMIN_A.id])
      );
      expect(rows).toHaveLength(1);
    });

    it("on ne voit PAS un profil d'un autre SDIS sans REX partagé", async () => {
      // ADMIN_B n'a écrit aucun REX inter-SDIS : rien ne justifie d'exposer
      // son identité hors de son SDIS.
      const { rows } = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM profiles WHERE id = $1`, [ADMIN_B.id])
      );
      expect(rows).toHaveLength(0);
    });

    it("on voit l'auteur d'un REX partagé, même d'un autre SDIS", async () => {
      // USER_B est auteur d'un REX validé inter-SDIS : son nom doit s'afficher.
      const { rows } = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM profiles WHERE id = $1`, [USER_B.id])
      );
      expect(rows).toHaveLength(1);
    });

    it('le super_admin voit tout le monde', async () => {
      const { rows } = await asUser(db, SUPER_ADMIN, () =>
        db.query(`SELECT id FROM profiles WHERE id = $1`, [ADMIN_B.id])
      );
      expect(rows).toHaveLength(1);
    });

    it('un non-authentifié ne voit aucun profil', async () => {
      const { rows } = await asUser(db, null, () => db.query(`SELECT id FROM profiles`));
      expect(rows).toHaveLength(0);
    });
  });

  describe('SELECT — email non divulgué (migration 024)', () => {
    // La policy de la 019 rend la LIGNE de profil d'un auteur de REX partagé
    // lisible hors de son SDIS, pour afficher son nom. Une policy ne filtre pas
    // les colonnes : l'email suivait. C'est un privilège de colonne qui le
    // retient désormais, donc l'erreur vient de Postgres, pas de la RLS.
    it("un agent ne peut pas lire l'email d'un auteur d'un autre SDIS", async () => {
      const err = await asUser(db, USER_A, () =>
        sqlThrows(db, `SELECT email FROM profiles WHERE id = $1`, [USER_B.id])
      );
      expect(err).toMatch(/permission denied/i);
    });

    it("un agent ne peut pas lire l'email d'un collègue de son SDIS", async () => {
      const err = await asUser(db, USER_A, () =>
        sqlThrows(db, `SELECT email FROM profiles WHERE id = $1`, [ADMIN_A.id])
      );
      expect(err).toMatch(/permission denied/i);
    });

    it("son propre email non plus — il se lit depuis la session, pas depuis l'annuaire", async () => {
      const err = await asUser(db, USER_A, () =>
        sqlThrows(db, `SELECT email FROM profiles WHERE id = $1`, [USER_A.id])
      );
      expect(err).toMatch(/permission denied/i);
    });

    it("`SELECT *` sur l'annuaire est refusé, il faut nommer les colonnes", async () => {
      // Conséquence assumée du privilège de colonne : le défaut devient la
      // non-divulgation. Tout code applicatif doit énumérer ce qu'il lit.
      const err = await asUser(db, USER_A, () => sqlThrows(db, `SELECT * FROM profiles`));
      expect(err).toMatch(/permission denied/i);
    });

    it("le nom et le grade d'un auteur partagé restent lisibles", async () => {
      // L'affichage inter-SDIS que la 019 voulait permettre continue de marcher.
      const { rows } = await asUser(db, USER_A, () =>
        db.query<{ full_name: string }>(`SELECT full_name, grade FROM profiles WHERE id = $1`, [
          USER_B.id,
        ])
      );
      expect(rows[0].full_name).toBe('Agent B');
    });

    it('le rôle service lit toujours les emails (invitations, export RGPD)', async () => {
      const { rows } = await asOwner(db, () =>
        db.query<{ email: string }>(`SELECT email FROM profiles WHERE id = $1`, [USER_B.id])
      );
      expect(rows[0].email).toBe('user.b@sdis13.fr');
    });
  });

  describe('UPDATE — colonnes privilégiées verrouillées', () => {
    it('un agent ne peut pas se promouvoir admin', async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(db, `UPDATE profiles SET role = 'admin' WHERE id = $1 RETURNING id`, [
          USER_A.id,
        ])
      );
      expect(err).toMatch(/Modification non autorisée des champs role \/ sdis_id/i);
    });

    it('un agent ne peut pas changer de SDIS', async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(db, `UPDATE profiles SET sdis_id = $1 WHERE id = $2 RETURNING id`, [
          SDIS_B,
          USER_A.id,
        ])
      );
      expect(err).toMatch(/Modification non autorisée des champs role \/ sdis_id/i);
    });

    it('un admin ne peut pas non plus changer un rôle avec son propre JWT', async () => {
      // Le trigger vise TOUTE écriture portant un JWT utilisateur : le
      // changement de rôle passe obligatoirement par le rôle service
      // (`createAdminClient`), après contrôle applicatif.
      const err = await asUser(db, ADMIN_A, () =>
        writeThrows(db, `UPDATE profiles SET role = 'validator' WHERE id = $1 RETURNING id`, [
          USER_A.id,
        ])
      );
      // Soit le trigger lève, soit la policy UPDATE (auth.uid() = id) ne matche
      // aucune ligne — dans les deux cas, aucune promotion n'a lieu.
      const stillUser = await asOwner(db, () =>
        db.query<{ role: string }>(`SELECT role FROM profiles WHERE id = $1`, [USER_A.id])
      );
      expect(stillUser.rows[0].role).toBe('user');
      expect(err === null || /Modification non autorisée/i.test(err)).toBe(true);
    });

    it('les champs non privilégiés restent modifiables', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(
          db,
          `UPDATE profiles SET full_name = 'Nouveau nom' WHERE id = $1 RETURNING id`,
          [USER_A.id]
        )
      );
      expect(n).toBe(1);
    });

    it('le rôle service peut toujours changer un rôle (onboarding, admin)', async () => {
      const n = await asOwner(db, () =>
        writeAffecting(db, `UPDATE profiles SET role = 'validator' WHERE id = $1 RETURNING id`, [
          USER_A.id,
        ])
      );
      expect(n).toBe(1);
    });
  });

  describe("Départ d'un contributeur — pourquoi on anonymise", () => {
    it("supprimer le profil d'un auteur de REX viole la clé étrangère", async () => {
      // C'est l'échec que subissait `DELETE /api/profile/delete`, qui comptait
      // sur une cascade inexistante : `rex.author_id` référence `profiles(id)`
      // sans `ON DELETE`. Dès qu'un agent avait écrit un REX, la suppression de
      // son compte répondait 500.
      //
      // Ce test fige la contrainte plutôt que la route : il dit pourquoi la
      // suppression est remplacée par une anonymisation. S'il se met à passer,
      // c'est qu'une cascade a été ajoutée — et qu'un départ d'agent efface
      // désormais des REX validés et partagés.
      const err = await asOwner(db, () =>
        sqlThrows(db, `DELETE FROM profiles WHERE id = $1`, [USER_A.id])
      );
      expect(err).toMatch(/rex_author_id_fkey|violates foreign key/i);
    });

    it("l'anonymisation sur place, elle, aboutit et laisse les REX en place", async () => {
      const n = await asOwner(db, () =>
        writeAffecting(
          db,
          `UPDATE profiles
             SET full_name = 'Compte supprimé', email = $2, grade = NULL, avatar_url = NULL
           WHERE id = $1 RETURNING id`,
          [USER_A.id, `compte-supprime+${USER_A.id}@retex360.invalid`]
        )
      );
      expect(n).toBe(1);

      const { rows } = await asOwner(db, () =>
        db.query<{ count: string }>(`SELECT count(*) AS count FROM rex WHERE author_id = $1`, [
          USER_A.id,
        ])
      );
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('Compte démo en lecture seule (migration 014)', () => {
    it('le compte démo ne peut pas créer de REX', async () => {
      const err = await asUser(db, DEMO, () =>
        writeThrows(
          db,
          `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity)
           VALUES ($1, $2, 'Vandalisme', '2026-02-01', 'Incendie', 'majeur') RETURNING id`,
          [SDIS_A, DEMO.id]
        )
      );
      expect(err).toMatch(/row-level security/i);
    });

    it('le compte démo lit normalement', async () => {
      const { rows } = await asUser(db, DEMO, () => db.query(`SELECT id FROM rex`));
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
