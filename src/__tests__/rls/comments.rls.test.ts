import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, asUser, asOwner, writeAffecting } from './harness';
import {
  USER_A,
  VALIDATOR_A,
  ADMIN_A,
  USER_B,
  ADMIN_B,
  REX_A_VALIDATED_SDIS,
  REX_B_VALIDATED_SDIS,
  COMMENT_A,
  COMMENT_B,
} from './fixtures';

/**
 * Couvre la migration 021. Avant elle, la policy DELETE était
 * `author_id = auth.uid()` : la suppression d'un commentaire par un admin était
 * un no-op silencieux — l'API répondait « supprimé » sans rien supprimer.
 */
describe('RLS — table comments (migration 021)', () => {
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

  describe('DELETE — modération', () => {
    it('un auteur supprime son propre commentaire', async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(db, `DELETE FROM comments WHERE id = $1 RETURNING id`, [COMMENT_A])
      );
      expect(n).toBe(1);
    });

    it("l'admin du SDIS du REX parent supprime le commentaire d'un tiers", async () => {
      const n = await asUser(db, ADMIN_A, () =>
        writeAffecting(db, `DELETE FROM comments WHERE id = $1 RETURNING id`, [COMMENT_A])
      );
      expect(n).toBe(1);
    });

    it("un admin d'un AUTRE SDIS ne supprime pas, et sans erreur", async () => {
      const n = await asUser(db, ADMIN_B, () =>
        writeAffecting(db, `DELETE FROM comments WHERE id = $1 RETURNING id`, [COMMENT_A])
      );
      expect(n).toBe(0);

      const stillThere = await asOwner(db, () =>
        db.query(`SELECT id FROM comments WHERE id = $1`, [COMMENT_A])
      );
      expect(stillThere.rows).toHaveLength(1);
    });

    it("un validateur n'est pas modérateur", async () => {
      // La 021 ouvre la modération à `admin`/`super_admin` seulement, en miroir
      // de ce que l'application autorise.
      const n = await asUser(db, VALIDATOR_A, () =>
        writeAffecting(db, `DELETE FROM comments WHERE id = $1 RETURNING id`, [COMMENT_A])
      );
      expect(n).toBe(0);
    });

    it("un agent ordinaire ne supprime pas le commentaire d'un autre", async () => {
      const n = await asUser(db, USER_B, () =>
        writeAffecting(db, `DELETE FROM comments WHERE id = $1 RETURNING id`, [COMMENT_A])
      );
      expect(n).toBe(0);
    });

    it('emporte les réponses en cascade', async () => {
      const replyId = await asOwner(db, async () => {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO comments (rex_id, author_id, parent_id, content)
           VALUES ($1, $2, $3, 'réponse') RETURNING id`,
          [REX_A_VALIDATED_SDIS, USER_B.id, COMMENT_A]
        );
        return rows[0].id;
      });

      await asUser(db, ADMIN_A, () =>
        writeAffecting(db, `DELETE FROM comments WHERE id = $1 RETURNING id`, [COMMENT_A])
      );

      const orphan = await asOwner(db, () =>
        db.query(`SELECT id FROM comments WHERE id = $1`, [replyId])
      );
      expect(orphan.rows).toHaveLength(0);
    });
  });

  describe("UPDATE — réservé à l'auteur", () => {
    it("l'auteur modifie son commentaire", async () => {
      const n = await asUser(db, USER_A, () =>
        writeAffecting(db, `UPDATE comments SET content = 'modifié' WHERE id = $1 RETURNING id`, [
          COMMENT_A,
        ])
      );
      expect(n).toBe(1);
    });

    it("un admin ne réécrit pas les propos d'un tiers", async () => {
      const n = await asUser(db, ADMIN_A, () =>
        writeAffecting(db, `UPDATE comments SET content = 'réécrit' WHERE id = $1 RETURNING id`, [
          COMMENT_A,
        ])
      );
      expect(n).toBe(0);
    });
  });

  describe('SELECT / INSERT — suivent la visibilité du REX', () => {
    it("un agent ne voit pas les commentaires d'un REX interne d'un autre SDIS", async () => {
      const invisible = await asOwner(db, async () => {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO comments (rex_id, author_id, content)
           VALUES ($1, $2, 'interne B') RETURNING id`,
          [REX_B_VALIDATED_SDIS, USER_B.id]
        );
        return rows[0].id;
      });

      const { rows } = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM comments WHERE id = $1`, [invisible])
      );
      expect(rows).toHaveLength(0);
    });

    it('un agent voit les commentaires des REX inter-SDIS', async () => {
      const { rows } = await asUser(db, USER_A, () =>
        db.query(`SELECT id FROM comments WHERE id = $1`, [COMMENT_B])
      );
      expect(rows).toHaveLength(1);
    });
  });
});
