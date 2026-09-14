import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, asUser, writeAffecting, writeThrows } from './harness';
import {
  SDIS_A,
  SDIS_B,
  USER_A,
  VALIDATOR_A,
  ADMIN_A,
  USER_B,
  ADMIN_B,
  SUPER_ADMIN,
  REX_A_VALIDATED_SDIS,
  REX_A_VALIDATED_INTER,
  REX_A_PENDING,
  REX_A_DRAFT,
  REX_B_VALIDATED_SDIS,
  REX_B_VALIDATED_INTER,
  REX_B_PENDING,
  REX_B_DRAFT,
} from './fixtures';

describe('RLS — table rex', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await db?.close();
  });

  // Chaque test s'exécute dans une transaction annulée : les écritures d'un
  // test ne contaminent pas le suivant.
  beforeEach(async () => {
    await db.exec('BEGIN');
  });
  afterEach(async () => {
    await db.exec('ROLLBACK');
  });

  const visibleTo = (user: Parameters<typeof asUser>[1]) =>
    asUser(db, user, async () => {
      const { rows } = await db.query<{ id: string }>(`SELECT id FROM rex ORDER BY id`);
      return rows.map((r) => r.id);
    });

  describe('SELECT — cloisonnement par SDIS', () => {
    it("l'auteur voit tous ses REX, quel que soit le statut", async () => {
      const seen = await visibleTo(USER_A);
      expect(seen).toEqual(
        expect.arrayContaining([
          REX_A_VALIDATED_SDIS,
          REX_A_VALIDATED_INTER,
          REX_A_PENDING,
          REX_A_DRAFT,
        ])
      );
    });

    it("un agent ne voit RIEN des brouillons ni des REX SDIS d'un autre SDIS", async () => {
      const seen = await visibleTo(USER_A);
      expect(seen).not.toContain(REX_B_VALIDATED_SDIS);
      expect(seen).not.toContain(REX_B_PENDING);
      expect(seen).not.toContain(REX_B_DRAFT);
    });

    it('un agent voit les REX validés inter-SDIS des autres SDIS', async () => {
      const seen = await visibleTo(USER_A);
      expect(seen).toContain(REX_B_VALIDATED_INTER);
    });

    it("un validateur voit les REX en attente de SON SDIS, pas ceux d'un autre", async () => {
      const seen = await visibleTo(VALIDATOR_A);
      expect(seen).toContain(REX_A_PENDING);
      expect(seen).not.toContain(REX_B_PENDING);
    });

    it("un validateur ne voit pas le brouillon d'un autre agent de son SDIS", async () => {
      const seen = await visibleTo(VALIDATOR_A);
      expect(seen).not.toContain(REX_A_DRAFT);
    });

    it("un admin d'un autre SDIS ne voit pas les REX en attente", async () => {
      // Le rôle admin ne franchit pas la frontière de tenant.
      const seen = await visibleTo(ADMIN_B);
      expect(seen).not.toContain(REX_A_PENDING);
      expect(seen).not.toContain(REX_A_VALIDATED_SDIS);
    });

    it('le super_admin voit les REX en attente de TOUS les SDIS', async () => {
      const seen = await visibleTo(SUPER_ADMIN);
      expect(seen).toContain(REX_A_PENDING);
      expect(seen).toContain(REX_B_PENDING);
    });

    it("le super_admin ne voit PAS les brouillons ni les REX internes d'un autre SDIS", async () => {
      // Nuance importante, et volontaire : la policy SELECT (013) n'accorde le
      // transverse au super_admin que pour le statut `pending`. Un REX validé en
      // visibilité `sdis` d'un autre SDIS, ou un brouillon d'autrui, lui reste
      // masqué. Le panel super_admin affiche des agrégats complets parce qu'il
      // passe par le rôle service (`createAdminClient`), qui contourne la RLS —
      // pas parce que la policy le lui permettrait.
      const seen = await visibleTo(SUPER_ADMIN);
      expect(seen).not.toContain(REX_B_VALIDATED_SDIS);
      expect(seen).not.toContain(REX_B_DRAFT);
      expect(seen).not.toContain(REX_A_DRAFT);
    });

    it('un utilisateur non authentifié ne voit aucun REX', async () => {
      const seen = await visibleTo(null);
      expect(seen).toEqual([]);
    });
  });

  describe('INSERT — le SDIS est imposé (migration 019)', () => {
    it("refuse la création d'un REX dans un autre SDIS", async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(
          db,
          `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity)
           VALUES ($1, $2, 'Évasion de tenant', '2026-02-01', 'Incendie', 'majeur') RETURNING id`,
          [SDIS_B, USER_A.id]
        )
      );
      expect(err).toMatch(/row-level security/i);
    });

    it("refuse la création d'un REX au nom d'un autre auteur", async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(
          db,
          `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity)
           VALUES ($1, $2, 'Usurpation', '2026-02-01', 'Incendie', 'majeur') RETURNING id`,
          [SDIS_A, USER_B.id]
        )
      );
      expect(err).toMatch(/row-level security/i);
    });

    it('accepte la création dans son propre SDIS', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(
          db,
          `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity)
           VALUES ($1, $2, 'REX légitime', '2026-02-01', 'Incendie', 'majeur') RETURNING id`,
          [SDIS_A, USER_A.id]
        )
      );
      expect(n).toBe(1);
    });
  });

  describe('UPDATE — auto-validation bloquée (migration 019)', () => {
    it('un agent ne peut pas valider son propre REX', async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(db, `UPDATE rex SET status = 'validated' WHERE id = $1 RETURNING id`, [
          REX_A_PENDING,
        ])
      );
      expect(err).toMatch(/Validation réservée aux validateurs/i);
    });

    it('un validateur du même SDIS peut valider', async () => {
      const n = await asUser(db, VALIDATOR_A, () =>
        writeAffecting(db, `UPDATE rex SET status = 'validated' WHERE id = $1 RETURNING id`, [
          REX_A_PENDING,
        ])
      );
      expect(n).toBe(1);
    });

    it("un validateur ne peut pas valider le REX d'un autre SDIS", async () => {
      // Le REX n'est même pas visible : l'UPDATE ne matche aucune ligne.
      const n = await asUser(db, VALIDATOR_A, () =>
        writeAffecting(db, `UPDATE rex SET status = 'validated' WHERE id = $1 RETURNING id`, [
          REX_B_PENDING,
        ])
      );
      expect(n).toBe(0);
    });
  });

  describe('INSERT — le statut est contraint (migration 024)', () => {
    // Le trou d'origine : la policy INSERT de la 019 n'imposait que l'auteur et
    // le SDIS, et le trigger de garde ne couvrait que l'UPDATE. Un agent créait
    // donc son REX directement validé, sans passer par personne.
    it('un agent ne peut pas créer un REX déjà validé', async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(
          db,
          `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity, status, visibility)
           VALUES ($1, $2, 'Auto-validation', '2026-02-01', 'Incendie', 'majeur', 'validated', 'inter_sdis')
           RETURNING id`,
          [SDIS_A, USER_A.id]
        )
      );
      expect(err).toMatch(/statuts draft \/ pending/i);
    });

    it('un agent ne peut pas se décerner les métadonnées de validation', async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(
          db,
          `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity, numero_rex)
           VALUES ($1, $2, 'Faux numéro', '2026-02-01', 'Incendie', 'majeur', 'RETEX-06-2026-001')
           RETURNING id`,
          [SDIS_A, USER_A.id]
        )
      );
      expect(err).toMatch(/Métadonnées de validation/i);
    });

    it('la création en brouillon et en attente reste ouverte', async () => {
      for (const status of ['draft', 'pending']) {
        const n = await asUser(db, USER_A, () =>
          writeAffecting(
            db,
            `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity, status)
             VALUES ($1, $2, 'Parcours normal', '2026-02-01', 'Incendie', 'majeur', $3) RETURNING id`,
            [SDIS_A, USER_A.id, status]
          )
        );
        expect(n).toBe(1);
      }
    });

    it('un validateur peut créer un REX validé', async () => {
      const n = await asUser(db, VALIDATOR_A, () =>
        writeAffecting(
          db,
          `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity, status)
           VALUES ($1, $2, 'Saisie par le validateur', '2026-02-01', 'Incendie', 'majeur', 'validated')
           RETURNING id`,
          [SDIS_A, VALIDATOR_A.id]
        )
      );
      expect(n).toBe(1);
    });
  });

  describe('UPDATE — rattachement figé (migration 024)', () => {
    it('un agent ne peut pas déplacer son REX vers un autre SDIS', async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(db, `UPDATE rex SET sdis_id = $1 WHERE id = $2 RETURNING id`, [
          SDIS_B,
          REX_A_DRAFT,
        ])
      );
      expect(err).toMatch(/SDIS de rattachement/i);
    });

    it('un agent ne peut pas réattribuer son REX à un autre auteur', async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(db, `UPDATE rex SET author_id = $1 WHERE id = $2 RETURNING id`, [
          USER_B.id,
          REX_A_DRAFT,
        ])
      );
      expect(err).toMatch(/auteur d'un REX/i);
    });
  });

  describe('UPDATE — contenu figé après validation (migration 024)', () => {
    it("l'auteur ne peut plus modifier son REX une fois validé", async () => {
      // Le contrôle existait dans la route PUT, pas dans la base : une requête
      // PostgREST directe passait outre, et le REX consulté n'était plus celui
      // qui avait été approuvé.
      const err = await asUser(db, USER_A, () =>
        writeThrows(
          db,
          `UPDATE rex SET title = 'Titre réécrit après coup' WHERE id = $1 RETURNING id`,
          [REX_A_VALIDATED_SDIS]
        )
      );
      expect(err).toMatch(/REX validé/i);
    });

    it("l'auteur ne peut pas non plus élargir la visibilité d'un REX validé", async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(db, `UPDATE rex SET visibility = 'public' WHERE id = $1 RETURNING id`, [
          REX_A_VALIDATED_SDIS,
        ])
      );
      expect(err).toMatch(/REX validé/i);
    });

    it('un validateur du SDIS peut corriger un REX validé', async () => {
      const n = await asUser(db, VALIDATOR_A, () =>
        writeAffecting(
          db,
          `UPDATE rex SET title = 'Correction validée' WHERE id = $1 RETURNING id`,
          [REX_A_VALIDATED_SDIS]
        )
      );
      expect(n).toBe(1);
    });

    it('le compteur de vues reste incrémentable sur un REX validé', async () => {
      // Exclusion délibérée du gel : la consultation d'un REX validé écrit
      // `views_count` sous l'identité du LECTEUR. Sans cette exception, ouvrir
      // un REX validé lèverait une exception.
      const n = await asUser(db, USER_A, () =>
        writeAffecting(
          db,
          `UPDATE rex SET views_count = views_count + 1 WHERE id = $1 RETURNING id`,
          [REX_A_VALIDATED_SDIS]
        )
      );
      expect(n).toBe(1);
    });

    it('le brouillon de son auteur reste librement modifiable', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(
          db,
          `UPDATE rex SET title = 'Brouillon retravaillé' WHERE id = $1 RETURNING id`,
          [REX_A_DRAFT]
        )
      );
      expect(n).toBe(1);
    });
  });

  describe('DELETE — frontière de tenant (régression du lot 2)', () => {
    it("un admin d'un AUTRE SDIS ne supprime pas, et l'écriture ne lève PAS d'erreur", async () => {
      // Le scénario exact du lot 2 : ADMIN_B voit ce REX (validé inter-SDIS),
      // le contrôle applicatif « est-il admin ? » passait, et la base refusait
      // en silence — 0 ligne, aucune erreur. D'où la réponse « REX supprimé »
      // alors que les fichiers venaient d'être détruits.
      const n = await asUser(db, ADMIN_B, () =>
        writeAffecting(db, `DELETE FROM rex WHERE id = $1 RETURNING id`, [REX_A_VALIDATED_INTER])
      );
      expect(n).toBe(0);

      const stillThere = await db.query(`SELECT id FROM rex WHERE id = $1`, [
        REX_A_VALIDATED_INTER,
      ]);
      expect(stillThere.rows).toHaveLength(1);
    });

    it("l'admin du bon SDIS supprime", async () => {
      const n = await asUser(db, ADMIN_A, () =>
        writeAffecting(db, `DELETE FROM rex WHERE id = $1 RETURNING id`, [REX_A_VALIDATED_INTER])
      );
      expect(n).toBe(1);
    });

    it('un agent supprime son propre REX', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(db, `DELETE FROM rex WHERE id = $1 RETURNING id`, [REX_A_DRAFT])
      );
      expect(n).toBe(1);
    });

    it("un agent ne supprime pas le REX d'un autre", async () => {
      const n = await asUser(db, USER_B, () =>
        writeAffecting(db, `DELETE FROM rex WHERE id = $1 RETURNING id`, [REX_A_VALIDATED_INTER])
      );
      expect(n).toBe(0);
    });
  });
});
