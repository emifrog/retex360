import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, asUser, asOwner, sqlThrows, writeAffecting } from './harness';
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
  REX_B_PENDING,
  ATTACHMENT_A,
  ATTACHMENT_STAGED,
} from './fixtures';

/**
 * Couvre la migration 026 — remise en état après l'audit de novembre 2026.
 *
 * Chaque bloc correspond à un défaut constaté sur le schéma d'avant : rejet
 * impossible, numérotation bloquée après une suppression, profil auto-attribué,
 * pièce jointe pointant vers le fichier d'un autre, REX validé supprimable par
 * son auteur, adresse de profil modifiable.
 */
describe('RLS — migration 026 (remise en état)', () => {
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

  const statusOf = async (rexId: string) => {
    const { rows } = await asOwner(db, () =>
      db.query<{ status: string; rejection_reason: string | null; numero_rex: string | null }>(
        `SELECT status, rejection_reason, numero_rex FROM rex WHERE id = $1`,
        [rexId]
      )
    );
    return rows[0];
  };

  // --------------------------------------------------------------------------
  // Rejet
  // --------------------------------------------------------------------------
  describe('reject_rex()', () => {
    const reject = (rexId: string, reason: string | null = 'Chronologie à compléter') =>
      db.query<{ author_id: string; title: string }>(`SELECT * FROM reject_rex($1, $2)`, [
        rexId,
        reason,
      ]);

    it('un validateur du SDIS rejette un REX en attente : il repasse en brouillon avec le motif', async () => {
      // Le défaut d'origine : la route faisait un UPDATE direct, que Postgres
      // refusait parce que le brouillon obtenu n'est lisible que par son auteur.
      const { rows } = await asUser(db, VALIDATOR_A, () => reject(REX_A_PENDING));
      expect(rows).toHaveLength(1);
      expect(rows[0].author_id).toBe(USER_A.id);

      const after = await statusOf(REX_A_PENDING);
      expect(after.status).toBe('draft');
      expect(after.rejection_reason).toBe('Chronologie à compléter');
    });

    it("l'admin du SDIS rejette aussi", async () => {
      const { rows } = await asUser(db, ADMIN_A, () => reject(REX_A_PENDING));
      expect(rows).toHaveLength(1);
      expect((await statusOf(REX_A_PENDING)).status).toBe('draft');
    });

    it('le super_admin rejette dans un autre SDIS', async () => {
      const { rows } = await asUser(db, SUPER_ADMIN, () => reject(REX_B_PENDING));
      expect(rows).toHaveLength(1);
      expect((await statusOf(REX_B_PENDING)).status).toBe('draft');
    });

    it("un admin d'un AUTRE SDIS ne rejette rien, et le REX reste en attente", async () => {
      const { rows } = await asUser(db, ADMIN_B, () => reject(REX_A_PENDING));
      expect(rows).toHaveLength(0);
      expect((await statusOf(REX_A_PENDING)).status).toBe('pending');
    });

    it('un simple agent ne rejette rien, pas même son propre REX', async () => {
      const { rows } = await asUser(db, USER_A, () => reject(REX_A_PENDING));
      expect(rows).toHaveLength(0);
      expect((await statusOf(REX_A_PENDING)).status).toBe('pending');
    });

    it("un REX qui n'est pas en attente n'est pas touché", async () => {
      const { rows } = await asUser(db, VALIDATOR_A, () => reject(REX_A_VALIDATED_SDIS));
      expect(rows).toHaveLength(0);
      expect((await statusOf(REX_A_VALIDATED_SDIS)).status).toBe('validated');
    });

    it('le motif est borné à 1000 caractères', async () => {
      await asUser(db, VALIDATOR_A, () => reject(REX_A_PENDING, 'x'.repeat(5000)));
      expect((await statusOf(REX_A_PENDING)).rejection_reason).toHaveLength(1000);
    });

    it('un SDIS en lecture seule (abonnement suspendu) ne peut pas rejeter', async () => {
      await asOwner(db, () =>
        db.query(
          `INSERT INTO subscriptions (sdis_id, plan, status) VALUES ($1, 'essentiel', 'suspended')`,
          [SDIS_A]
        )
      );
      const { rows } = await asUser(db, VALIDATOR_A, () => reject(REX_A_PENDING));
      expect(rows).toHaveLength(0);
      expect((await statusOf(REX_A_PENDING)).status).toBe('pending');
    });

    it("un anonyme n'a pas le droit d'appeler la fonction", async () => {
      const err = await asUser(db, null, () =>
        sqlThrows(db, `SELECT * FROM reject_rex($1, 'x')`, [REX_A_PENDING])
      );
      expect(err).toMatch(/permission denied/i);
    });
  });

  // --------------------------------------------------------------------------
  // Numérotation
  // --------------------------------------------------------------------------
  describe('numérotation des REX validés', () => {
    const VALIDATE = `UPDATE rex SET status = 'validated', validated_by = $1, validated_at = now()
                      WHERE id = $2 AND status = 'pending'`;

    // Les huit premiers caractères diffèrent : le slug d'un REX reprend le
    // début de son identifiant, et il est unique.
    const NEW_REX = [
      'e1000001-0000-4000-a000-000000000001',
      'e1000002-0000-4000-a000-000000000002',
      'e1000003-0000-4000-a000-000000000003',
      'e1000004-0000-4000-a000-000000000004',
    ];

    const insertPending = (id: string, sdisId: string, authorId: string) =>
      asOwner(db, () =>
        db.query(
          `INSERT INTO rex (id, sdis_id, author_id, title, intervention_date, type, severity, status, visibility)
           VALUES ($1, $2, $3, 'REX de test numérotation', '2026-03-01', 'Autre', 'majeur', 'pending', 'sdis')`,
          [id, sdisId, authorId]
        )
      );

    it("après la suppression d'un REX numéroté, la validation suivante obtient un numéro libre", async () => {
      // Le défaut d'origine : `COUNT(*) + 1`. Trois REX numérotés 001 à 003,
      // suppression du 001, et le suivant recevait de nouveau 003 — violation
      // d'unicité, donc plus aucune validation possible pour ce SDIS et cette
      // année.
      for (const id of NEW_REX) await insertPending(id, SDIS_A, USER_A.id);
      for (const id of NEW_REX.slice(0, 3)) {
        const err = await asUser(db, VALIDATOR_A, () =>
          sqlThrows(db, VALIDATE, [VALIDATOR_A.id, id])
        );
        expect(err).toBeNull();
      }
      expect((await statusOf(NEW_REX[2])).numero_rex).toBe('RETEX-06-2026-003');

      await asOwner(db, () => db.query(`DELETE FROM rex WHERE id = $1`, [NEW_REX[0]]));

      const err = await asUser(db, VALIDATOR_A, () =>
        sqlThrows(db, VALIDATE, [VALIDATOR_A.id, NEW_REX[3]])
      );
      expect(err).toBeNull();
      expect((await statusOf(NEW_REX[3])).numero_rex).toBe('RETEX-06-2026-004');
    });

    it('le numéro tient compte des REX que le validateur ne peut pas lire', async () => {
      // Un REX « Mon SDIS » du SDIS 13 porte déjà le 001 ; le super_admin ne le
      // voit pas. Compté sous sa propre visibilité, le suivant recevait 001.
      await asOwner(db, async () => {
        await db.query(
          `UPDATE rex SET numero_rex = 'RETEX-13-2026-001', intervention_date = '2026-01-14' WHERE id = $1`,
          [REX_B_VALIDATED_SDIS]
        );
        await db.query(
          `UPDATE rex SET visibility = 'inter_sdis', intervention_date = '2026-02-02' WHERE id = $1`,
          [REX_B_PENDING]
        );
      });

      const err = await asUser(db, SUPER_ADMIN, () =>
        sqlThrows(db, VALIDATE, [SUPER_ADMIN.id, REX_B_PENDING])
      );
      expect(err).toBeNull();
      expect((await statusOf(REX_B_PENDING)).numero_rex).toBe('RETEX-13-2026-002');
    });
  });

  // --------------------------------------------------------------------------
  // Profils
  // --------------------------------------------------------------------------
  describe('profiles', () => {
    it("un compte authentifié sans profil ne peut pas s'en créer un", async () => {
      // Le défaut d'origine : la policy INSERT ne vérifiait que `auth.uid() = id`.
      // Le rôle et le SDIS étaient donc au choix de l'appelant, `super_admin`
      // compris. Les profils sont créés par le rôle service, à l'inscription.
      const ghost = { id: 'c0000000-0000-4000-a000-00000000dead', email: 'ghost@example.org' };
      await asOwner(db, () =>
        db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [ghost.id, ghost.email])
      );

      const err = await asUser(db, ghost, () =>
        sqlThrows(
          db,
          `INSERT INTO profiles (id, sdis_id, email, full_name, role)
           VALUES ($1, $2, $3, 'Ghost', 'super_admin')`,
          [ghost.id, SDIS_B, ghost.email]
        )
      );
      expect(err).toMatch(/row-level security|permission denied/i);
    });

    it('un utilisateur ne peut pas réécrire son adresse dans son profil', async () => {
      // L'adresse est une copie de celle du compte ; les écrans d'administration
      // et la réinitialisation par le super_admin s'y fient.
      const err = await asUser(db, USER_A, () =>
        sqlThrows(db, `UPDATE profiles SET email = 'admin.a@sdis06.fr' WHERE id = $1`, [USER_A.id])
      );
      expect(err).toMatch(/permission denied/i);
    });

    it('il peut toujours modifier son nom, son grade et son avatar', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(
          db,
          `UPDATE profiles SET full_name = 'Nouveau Nom', grade = 'Capitaine', avatar_url = 'https://x/y.webp'
           WHERE id = $1 RETURNING id`,
          [USER_A.id]
        )
      );
      expect(n).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Pièces jointes
  // --------------------------------------------------------------------------
  describe('rex_attachments — chemin de stockage', () => {
    const victimPath = `rex-attachments/${USER_A.id}/a.webp`;

    it("refuse une ligne pointant vers le dossier d'un autre utilisateur", async () => {
      // Le défaut d'origine : `storage_path` était libre. La suppression de
      // cette ligne par son « déposant » faisait ensuite purger le fichier
      // d'autrui par le rôle service.
      const err = await asUser(db, USER_B, () =>
        sqlThrows(
          db,
          `INSERT INTO rex_attachments (rex_id, uploaded_by, file_name, storage_path)
           VALUES (NULL, $1, 'x.webp', $2)`,
          [USER_B.id, victimPath]
        )
      );
      expect(err).toMatch(/row-level security/i);
    });

    it('accepte toujours un dépôt dans son propre dossier', async () => {
      const n = await asUser(db, USER_B, () =>
        writeAffecting(
          db,
          `INSERT INTO rex_attachments (rex_id, uploaded_by, file_name, storage_path)
           VALUES (NULL, $1, 'x.webp', $2) RETURNING id`,
          [USER_B.id, `rex-attachments/${USER_B.id}/x.webp`]
        )
      );
      expect(n).toBe(1);
    });

    it("refuse de rediriger sa propre ligne vers le dossier d'un autre", async () => {
      const err = await asUser(db, USER_A, () =>
        sqlThrows(db, `UPDATE rex_attachments SET storage_path = $1 WHERE id = $2`, [
          `rex-attachments/${USER_B.id}/b.webp`,
          ATTACHMENT_STAGED,
        ])
      );
      expect(err).toMatch(/row-level security/i);
    });

    it('le rattachement à son REX reste possible', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(db, `UPDATE rex_attachments SET rex_id = $1 WHERE id = $2 RETURNING id`, [
          REX_A_DRAFT,
          ATTACHMENT_STAGED,
        ])
      );
      expect(n).toBe(1);
    });

    it('la pièce jointe existante reste lisible', async () => {
      const { rows } = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM rex_attachments WHERE id = $1`, [ATTACHMENT_A])
      );
      expect(rows).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // Suppression d'un REX validé
  // --------------------------------------------------------------------------
  describe("suppression d'un REX", () => {
    const del = (rexId: string) =>
      writeAffecting(db, `DELETE FROM rex WHERE id = $1 RETURNING id`, [rexId]);

    it("l'auteur ne supprime plus son REX une fois validé", async () => {
      // Le gel de la migration 024 ne couvrait que la modification : un REX
      // validé et partagé pouvait disparaître sur décision de son seul auteur.
      const n = await asUser(db, USER_A, () => del(REX_A_VALIDATED_INTER));
      expect(n).toBe(0);
    });

    it("l'auteur supprime toujours son brouillon", async () => {
      expect(await asUser(db, USER_A, () => del(REX_A_DRAFT))).toBe(1);
    });

    it("l'auteur supprime toujours son REX en attente", async () => {
      expect(await asUser(db, USER_A, () => del(REX_A_PENDING))).toBe(1);
    });

    it("l'admin du SDIS supprime un REX validé", async () => {
      expect(await asUser(db, ADMIN_A, () => del(REX_A_VALIDATED_INTER))).toBe(1);
    });
  });
});
