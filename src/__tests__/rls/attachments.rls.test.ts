import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, asUser, asOwner, writeAffecting, writeThrows } from './harness';
import {
  USER_A,
  VALIDATOR_A,
  ADMIN_A,
  USER_B,
  ADMIN_B,
  REX_A_VALIDATED_SDIS,
  REX_A_DRAFT,
  REX_B_VALIDATED_INTER,
  ATTACHMENT_A,
  ATTACHMENT_B,
  ATTACHMENT_STAGED,
} from './fixtures';

/**
 * Couvre la migration 020. Avant elle, `rex_attachments` n'avait que SELECT et
 * INSERT en permissif : UPDATE et DELETE étaient refusés à tout le monde, et
 * l'INSERT rejetait les dépôts non rattachés. Chaque test ci-dessous échouerait
 * sur le schéma d'avant.
 */
describe('RLS — table rex_attachments (migration 020)', () => {
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

  const insertAttachment = (uploadedBy: string, rexId: string | null) =>
    writeAffecting(
      db,
      `INSERT INTO rex_attachments (rex_id, uploaded_by, file_name, storage_path)
       VALUES ($1, $2, 'x.webp', $3) RETURNING id`,
      [rexId, uploadedBy, `rex-attachments/${uploadedBy}/x.webp`]
    );

  describe('INSERT', () => {
    it('accepte un dépôt NON rattaché (rex_id NULL)', async () => {
      // Le cas qui bloquait toute création de REX avec pièce jointe : le
      // fichier part avant que le REX existe.
      const n = await asUser(db, USER_A, () => insertAttachment(USER_A.id, null));
      expect(n).toBe(1);
    });

    it('accepte un dépôt sur son propre REX', async () => {
      const n = await asUser(db, USER_A, () => insertAttachment(USER_A.id, REX_A_DRAFT));
      expect(n).toBe(1);
    });

    it("refuse un dépôt sur le REX d'un autre", async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(
          db,
          `INSERT INTO rex_attachments (rex_id, uploaded_by, file_name, storage_path)
           VALUES ($1, $2, 'x.webp', 'p') RETURNING id`,
          [REX_B_VALIDATED_INTER, USER_A.id]
        )
      );
      expect(err).toMatch(/row-level security/i);
    });

    it("refuse un dépôt au nom d'un autre utilisateur", async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(
          db,
          `INSERT INTO rex_attachments (rex_id, uploaded_by, file_name, storage_path)
           VALUES (NULL, $1, 'x.webp', 'p') RETURNING id`,
          [USER_B.id]
        )
      );
      expect(err).toMatch(/row-level security/i);
    });
  });

  describe('SELECT', () => {
    it('le déposant relit son dépôt non rattaché', async () => {
      // Sans cette branche, le `INSERT ... RETURNING` de la route d'upload
      // échouerait : la ligne insérée ne serait pas re-lisible.
      const { rows } = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM rex_attachments WHERE id = $1`, [ATTACHMENT_STAGED])
      );
      expect(rows).toHaveLength(1);
    });

    it('un autre utilisateur ne voit pas un dépôt non rattaché', async () => {
      const { rows } = await asUser(db, USER_B, () =>
        db.query(`SELECT id FROM rex_attachments WHERE id = $1`, [ATTACHMENT_STAGED])
      );
      expect(rows).toHaveLength(0);
    });

    it('les pièces jointes suivent la visibilité du REX parent', async () => {
      const visible = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM rex_attachments WHERE id = $1`, [ATTACHMENT_B])
      );
      // ATTACHMENT_B est sur un REX validé inter-SDIS : visible.
      expect(visible.rows).toHaveLength(1);
    });
  });

  describe('UPDATE — rattachement post-création', () => {
    it('le déposant rattache son dépôt à son propre REX', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(db, `UPDATE rex_attachments SET rex_id = $1 WHERE id = $2 RETURNING id`, [
          REX_A_DRAFT,
          ATTACHMENT_STAGED,
        ])
      );
      expect(n).toBe(1);
    });

    it("refuse le rattachement au REX d'un autre", async () => {
      const err = await asUser(db, USER_A, () =>
        writeThrows(db, `UPDATE rex_attachments SET rex_id = $1 WHERE id = $2 RETURNING id`, [
          REX_B_VALIDATED_INTER,
          ATTACHMENT_STAGED,
        ])
      );
      expect(err).toMatch(/row-level security/i);
    });

    it("un tiers ne rattache pas le dépôt de quelqu'un d'autre", async () => {
      const n = await asUser(db, USER_B, () =>
        writeAffecting(db, `UPDATE rex_attachments SET rex_id = $1 WHERE id = $2 RETURNING id`, [
          REX_B_VALIDATED_INTER,
          ATTACHMENT_STAGED,
        ])
      );
      expect(n).toBe(0);
    });
  });

  describe('DELETE', () => {
    it('le déposant supprime sa pièce jointe', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(db, `DELETE FROM rex_attachments WHERE id = $1 RETURNING id`, [ATTACHMENT_A])
      );
      expect(n).toBe(1);
    });

    it("l'admin du SDIS du REX parent supprime", async () => {
      const n = await asUser(db, ADMIN_A, () =>
        writeAffecting(db, `DELETE FROM rex_attachments WHERE id = $1 RETURNING id`, [ATTACHMENT_A])
      );
      expect(n).toBe(1);
    });

    it("un admin d'un AUTRE SDIS ne supprime pas, sans erreur (régression lot 2 + 6)", async () => {
      // Le scénario destructeur : l'ancien code purgeait le fichier AVANT ce
      // DELETE, qui renvoie 0 ligne et aucune erreur. Fichier perdu, ligne
      // conservée, réponse « supprimé ».
      const n = await asUser(db, ADMIN_B, () =>
        writeAffecting(db, `DELETE FROM rex_attachments WHERE id = $1 RETURNING id`, [ATTACHMENT_A])
      );
      expect(n).toBe(0);

      const stillThere = await asOwner(db, () =>
        db.query(`SELECT id FROM rex_attachments WHERE id = $1`, [ATTACHMENT_A])
      );
      expect(stillThere.rows).toHaveLength(1);
    });

    it("l'auteur du REX supprime une pièce jointe déposée par un tiers", async () => {
      const foreign = await asOwner(db, async () => {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO rex_attachments (rex_id, uploaded_by, file_name, storage_path)
           VALUES ($1, $2, 'tiers.webp', 'p/tiers.webp') RETURNING id`,
          [REX_A_VALIDATED_SDIS, VALIDATOR_A.id]
        );
        return rows[0].id;
      });

      const n = await asUser(db, USER_A, () =>
        writeAffecting(db, `DELETE FROM rex_attachments WHERE id = $1 RETURNING id`, [foreign])
      );
      expect(n).toBe(1);
    });

    it('un utilisateur sans lien ne supprime rien', async () => {
      const n = await asUser(db, USER_B, () =>
        writeAffecting(db, `DELETE FROM rex_attachments WHERE id = $1 RETURNING id`, [ATTACHMENT_A])
      );
      expect(n).toBe(0);
    });
  });

  it("reproduit le parcours complet de création d'un REX avec pièce jointe", async () => {
    // Bout en bout, exactement ce que fait l'application : dépôt sans REX,
    // création du REX, rattachement. C'est ce parcours qui était cassé.
    const attachmentId = await asUser(db, USER_A, async () => {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO rex_attachments (rex_id, uploaded_by, file_name, storage_path)
         VALUES (NULL, $1, 'flow.webp', 'rex-attachments/flow.webp') RETURNING id`,
        [USER_A.id]
      );
      return rows[0].id;
    });
    expect(attachmentId).toBeTruthy();

    const rexId = await asUser(db, USER_A, async () => {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity)
         VALUES ((SELECT sdis_id FROM profiles WHERE id = $1), $1, 'Parcours complet',
                 '2026-03-01', 'Incendie', 'majeur') RETURNING id`,
        [USER_A.id]
      );
      return rows[0].id;
    });

    const linked = await asUser(db, USER_A, () =>
      writeAffecting(
        db,
        `UPDATE rex_attachments SET rex_id = $1 WHERE id = $2 AND uploaded_by = $3 RETURNING id`,
        [rexId, attachmentId, USER_A.id]
      )
    );
    expect(linked).toBe(1);
  });
});
