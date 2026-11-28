import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, asUser, asOwner, sqlThrows, writeAffecting } from './harness';
import {
  SDIS_A,
  USER_A,
  VALIDATOR_A,
  USER_B,
  REX_A_VALIDATED_SDIS,
  REX_A_VALIDATED_INTER,
  REX_A_PENDING,
  REX_A_DRAFT,
  REX_B_VALIDATED_SDIS,
} from './fixtures';

/**
 * Couvre la migration 027 — compteurs de vues et de favoris, notifications.
 *
 * Avant elle, les deux compteurs étaient écrits sous l'identité du lecteur, que
 * la policy de modification de `rex` n'autorise pas : pour un lecteur ordinaire
 * l'écriture touchait zéro ligne, sans erreur. Seules comptaient les
 * consultations de l'auteur et des validateurs — et l'auteur pouvait, lui,
 * écrire la valeur de son choix.
 */
describe('RLS — migration 027 (compteurs, notifications)', () => {
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

  const counters = async (rexId: string) => {
    const { rows } = await asOwner(db, () =>
      db.query<{ views_count: number; favorites_count: number; updated_at: string }>(
        `SELECT views_count, favorites_count, updated_at::text FROM rex WHERE id = $1`,
        [rexId]
      )
    );
    return rows[0];
  };

  const view = (rexId: string) => db.query(`SELECT increment_rex_views($1)`, [rexId]);

  // --------------------------------------------------------------------------
  // Vues
  // --------------------------------------------------------------------------
  describe('increment_rex_views()', () => {
    it("compte la consultation d'un lecteur qui n'est ni l'auteur ni un validateur", async () => {
      const before = await counters(REX_A_VALIDATED_INTER);
      await asUser(db, USER_B, () => view(REX_A_VALIDATED_INTER));
      const after = await counters(REX_A_VALIDATED_INTER);
      expect(after.views_count).toBe(before.views_count + 1);
    });

    it('incrémente en base, sans dépendre de la valeur lue par le navigateur', async () => {
      // L'ancien code écrivait « valeur lue + 1 » : deux lecteurs simultanés
      // écrivaient la même valeur, et une consultation se perdait.
      const before = await counters(REX_A_VALIDATED_INTER);
      await asUser(db, USER_B, () => view(REX_A_VALIDATED_INTER));
      await asUser(db, VALIDATOR_A, () => view(REX_A_VALIDATED_INTER));
      await asUser(db, USER_A, () => view(REX_A_VALIDATED_INTER));
      const after = await counters(REX_A_VALIDATED_INTER);
      expect(after.views_count).toBe(before.views_count + 3);
    });

    it('ne modifie pas la date de mise à jour du REX', async () => {
      // `updated_at` sert d'empreinte au cache du PDF et s'affiche comme date de
      // modification : une consultation n'est pas une modification.
      const before = await counters(REX_A_VALIDATED_INTER);
      await asUser(db, USER_B, () => view(REX_A_VALIDATED_INTER));
      const after = await counters(REX_A_VALIDATED_INTER);
      expect(after.updated_at).toBe(before.updated_at);
    });

    it('ne compte que les REX validés : ni brouillon, ni REX en attente', async () => {
      await asUser(db, USER_A, () => view(REX_A_DRAFT));
      await asUser(db, VALIDATOR_A, () => view(REX_A_PENDING));
      expect((await counters(REX_A_DRAFT)).views_count).toBe(0);
      expect((await counters(REX_A_PENDING)).views_count).toBe(0);
    });

    it("ne compte pas un REX que l'appelant ne peut pas lire", async () => {
      // REX « SDIS seul » du SDIS B : invisible pour un agent du SDIS A.
      const before = await counters(REX_B_VALIDATED_SDIS);
      await asUser(db, USER_A, () => view(REX_B_VALIDATED_SDIS));
      expect((await counters(REX_B_VALIDATED_SDIS)).views_count).toBe(before.views_count);
    });

    it('est refusée à un visiteur non connecté', async () => {
      const error = await asUser(db, null, () =>
        sqlThrows(db, `SELECT increment_rex_views($1)`, [REX_A_VALIDATED_INTER])
      );
      expect(error).toMatch(/permission denied/i);
    });
  });

  // --------------------------------------------------------------------------
  // Compteurs non falsifiables
  // --------------------------------------------------------------------------
  describe('compteurs protégés des écritures directes', () => {
    it("l'auteur ne peut pas fixer le nombre de vues ni de favoris de son REX", async () => {
      const affected = await asUser(db, USER_A, () =>
        writeAffecting(
          db,
          `UPDATE rex SET views_count = 9999, favorites_count = 500, title = 'A brouillon retouché'
           WHERE id = $1 RETURNING id`,
          [REX_A_DRAFT]
        )
      );
      // La modification du contenu passe ; les compteurs restent ce qu'ils étaient.
      expect(affected).toBe(1);
      const after = await counters(REX_A_DRAFT);
      expect(after.views_count).toBe(0);
      expect(after.favorites_count).toBe(0);
    });

    it('un REX ne se crée pas avec des compteurs déjà remplis', async () => {
      const { rows } = await asUser(db, USER_A, () =>
        db.query<{ id: string }>(
          `INSERT INTO rex (sdis_id, author_id, title, intervention_date, type, severity, status,
                            visibility, views_count, favorites_count)
           VALUES ($1, $2, 'Compteurs gonflés', '2026-02-01', 'Incendie', 'majeur', 'draft',
                   'sdis', 4000, 300)
           RETURNING id`,
          [SDIS_A, USER_A.id]
        )
      );
      const after = await counters(rows[0].id);
      expect(after.views_count).toBe(0);
      expect(after.favorites_count).toBe(0);
    });

    it('le rôle de service garde la main, pour une reprise de données', async () => {
      await asOwner(db, () =>
        db.query(`UPDATE rex SET views_count = 42 WHERE id = $1`, [REX_A_DRAFT])
      );
      expect((await counters(REX_A_DRAFT)).views_count).toBe(42);
    });
  });

  // --------------------------------------------------------------------------
  // Favoris
  // --------------------------------------------------------------------------
  describe('compteur de favoris', () => {
    const favorite = (user: typeof USER_A, rexId: string) =>
      asUser(db, user, () =>
        db.query(`INSERT INTO favorites (user_id, rex_id) VALUES ($1, $2)`, [user.id, rexId])
      );

    it("compte le favori d'un lecteur ordinaire", async () => {
      await favorite(USER_B, REX_A_VALIDATED_INTER);
      expect((await counters(REX_A_VALIDATED_INTER)).favorites_count).toBe(1);
    });

    it('compte chaque lecteur, puis décompte au retrait', async () => {
      await favorite(USER_B, REX_A_VALIDATED_INTER);
      await favorite(VALIDATOR_A, REX_A_VALIDATED_INTER);
      expect((await counters(REX_A_VALIDATED_INTER)).favorites_count).toBe(2);

      await asUser(db, USER_B, () =>
        db.query(`DELETE FROM favorites WHERE user_id = $1 AND rex_id = $2`, [
          USER_B.id,
          REX_A_VALIDATED_INTER,
        ])
      );
      expect((await counters(REX_A_VALIDATED_INTER)).favorites_count).toBe(1);
    });

    it('ne modifie pas la date de mise à jour du REX', async () => {
      const before = await counters(REX_A_VALIDATED_SDIS);
      await favorite(VALIDATOR_A, REX_A_VALIDATED_SDIS);
      const after = await counters(REX_A_VALIDATED_SDIS);
      expect(after.favorites_count).toBe(before.favorites_count + 1);
      expect(after.updated_at).toBe(before.updated_at);
    });

    it('ne descend jamais sous zéro', async () => {
      // Compteur historiquement faux (0) alors qu'un favori existe : son retrait
      // ne doit pas afficher « -1 favori ».
      await favorite(USER_B, REX_A_VALIDATED_INTER);
      await asOwner(db, () =>
        db.query(`UPDATE rex SET favorites_count = 0 WHERE id = $1`, [REX_A_VALIDATED_INTER])
      );
      await asUser(db, USER_B, () =>
        db.query(`DELETE FROM favorites WHERE user_id = $1 AND rex_id = $2`, [
          USER_B.id,
          REX_A_VALIDATED_INTER,
        ])
      );
      expect((await counters(REX_A_VALIDATED_INTER)).favorites_count).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Date de mise à jour
  // --------------------------------------------------------------------------
  describe('updated_at', () => {
    it('avance toujours quand le contenu change', async () => {
      const before = await counters(REX_A_DRAFT);
      await asUser(db, USER_A, () =>
        db.query(`UPDATE rex SET title = 'A brouillon, titre corrigé' WHERE id = $1`, [REX_A_DRAFT])
      );
      const after = await counters(REX_A_DRAFT);
      expect(after.updated_at).not.toBe(before.updated_at);
    });
  });

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------
  describe('suppression des notifications', () => {
    const NOTIF_A = 'd1000000-0000-4000-a000-0000000000a1';

    beforeEach(async () => {
      await asOwner(db, () =>
        db.query(
          `INSERT INTO notifications (id, user_id, type, title, content)
           VALUES ($1, $2, 'validation', 'REX validé', 'Votre REX a été validé')`,
          [NOTIF_A, USER_A.id]
        )
      );
    });

    it('un utilisateur supprime sa propre notification', async () => {
      // Aucune policy DELETE n'existait : la suppression touchait zéro ligne sans
      // erreur, et la notification revenait au rechargement.
      const affected = await asUser(db, USER_A, () =>
        writeAffecting(db, `DELETE FROM notifications WHERE id = $1 RETURNING id`, [NOTIF_A])
      );
      expect(affected).toBe(1);
    });

    it("ne supprime pas celle d'un autre", async () => {
      const affected = await asUser(db, USER_B, () =>
        writeAffecting(db, `DELETE FROM notifications WHERE id = $1 RETURNING id`, [NOTIF_A])
      );
      expect(affected).toBe(0);
    });
  });
});
