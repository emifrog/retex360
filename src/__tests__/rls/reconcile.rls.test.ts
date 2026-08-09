import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import path from 'path';
import { createTestDb } from './harness';
import { USER_A, ATTACHMENT_A, ATTACHMENT_B, ATTACHMENT_STAGED } from './fixtures';

/**
 * Vérifie le script de maintenance `reconcile_attachments.sql` sur un Postgres
 * réel, avec des fantômes et des orphelins fabriqués.
 *
 * Ce script sera lancé sur des données de production pour réparer les dégâts
 * antérieurs à la migration 020. Sa logique n'est pas triviale : les vignettes
 * existent dans le storage sans jamais être enregistrées en base, donc un
 * rapprochement naïf les compterait toutes comme orphelines. C'est exactement le
 * genre d'erreur qui ferait supprimer les mauvaises lignes.
 */
describe('Script de réconciliation des pièces jointes', () => {
  let db: PGlite;
  const script = readFileSync(
    path.join(process.cwd(), 'supabase', 'maintenance', 'reconcile_attachments.sql'),
    'utf8'
  );

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

  const addObject = (name: string) =>
    db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('rex-attachments', $1)`, [
      name,
    ]);

  const pathOf = async (attachmentId: string) => {
    const { rows } = await db.query<{ storage_path: string }>(
      `SELECT storage_path FROM rex_attachments WHERE id = $1`,
      [attachmentId]
    );
    return rows[0].storage_path;
  };

  const thumbOf = (p: string) => p.replace(/\.[^.]+$/, '_thumb.webp');

  type Section = 'synthese' | 'lignes_fantomes' | 'objets_orphelins' | 'vignettes_manquantes';

  /**
   * Exécute le script et renvoie les lignes de la section demandée.
   *
   * Le ciblage se fait sur la colonne `section`, pas sur la présence d'un nom de
   * colonne : les sections 2 et 4 exposent toutes deux `attachment_id`, et viser
   * la première correspondance rendait le test vert sans rien vérifier.
   */
  async function runScript(section: Section) {
    const results = (await db.exec(script)) as Array<{
      fields: Array<{ name: string }>;
      rows: Record<string, unknown>[];
    }>;
    const candidates = results.filter((r) => r.fields?.some((f) => f.name === 'section'));
    // Une section vide ne renvoie aucune ligne : on ne peut pas l'identifier par
    // son contenu. On s'appuie sur l'ordre des quatre SELECT du script.
    const order: Section[] = [
      'synthese',
      'lignes_fantomes',
      'objets_orphelins',
      'vignettes_manquantes',
    ];
    expect(candidates).toHaveLength(order.length);
    const hit = candidates[order.indexOf(section)];
    for (const row of hit.rows) {
      expect(row.section).toBe(section);
    }
    return hit.rows;
  }

  it("s'exécute sans erreur sur une base saine", async () => {
    await expect(db.exec(script)).resolves.toBeDefined();
  });

  it('compte correctement fantômes et orphelins', async () => {
    // A et B ont leur objet (+ vignette) ; STAGED n'a rien -> fantôme.
    const pathA = await pathOf(ATTACHMENT_A);
    const pathB = await pathOf(ATTACHMENT_B);
    await addObject(pathA);
    await addObject(thumbOf(pathA));
    await addObject(pathB);
    // Un objet que personne ne réclame -> orphelin.
    await addObject('rex-attachments/inconnu/perdu.webp');

    const [synthese] = await runScript('synthese');
    expect(Number(synthese.lignes_en_base)).toBe(3);
    expect(Number(synthese.objets_dans_le_bucket)).toBe(4);
    expect(Number(synthese.lignes_fantomes)).toBe(1);
    expect(Number(synthese.objets_orphelins)).toBe(1);
  });

  it('ne compte PAS les vignettes comme orphelines', async () => {
    // Le piège : une vignette n'a pas de ligne en base, par conception.
    const pathA = await pathOf(ATTACHMENT_A);
    await addObject(pathA);
    await addObject(thumbOf(pathA));

    const orphelins = await runScript('objets_orphelins');
    expect(orphelins.map((r) => r.objet)).not.toContain(thumbOf(pathA));
    // Contrôle que la section n'est pas vide pour la mauvaise raison : les deux
    // autres pièces jointes du seed n'ont pas d'objet, donc aucun orphelin ici.
    expect(orphelins).toHaveLength(0);
  });

  it('identifie la bonne ligne fantôme, avec son contexte', async () => {
    const pathA = await pathOf(ATTACHMENT_A);
    const pathStaged = await pathOf(ATTACHMENT_STAGED);
    await addObject(pathA);
    await addObject(pathStaged);
    // Le fichier de B a été détruit : sa ligne est fantôme.

    const fantomes = await runScript('lignes_fantomes');
    expect(fantomes).toHaveLength(1);
    expect(fantomes[0].attachment_id).toBe(ATTACHMENT_B);
    // Le contexte doit permettre de prévenir l'auteur.
    expect(fantomes[0].rex_titre).toBeTruthy();
    expect(fantomes[0].deposant_email).toBeTruthy();
  });

  it('signale une vignette manquante sur une image, jamais sur un PDF', async () => {
    await db.query(
      `INSERT INTO rex_attachments (rex_id, uploaded_by, file_name, file_type, storage_path)
       VALUES (NULL, $1, 'image.webp', 'image/webp', 'rex-attachments/x/image.webp'),
              (NULL, $1, 'doc.pdf', 'application/pdf', 'rex-attachments/x/doc.pdf'),
              (NULL, $1, 'anime.gif', 'image/gif', 'rex-attachments/x/anime.gif')`,
      [USER_A.id]
    );
    // Les trois originaux existent ; aucune vignette pour aucun d'eux.
    await addObject('rex-attachments/x/image.webp');
    await addObject('rex-attachments/x/doc.pdf');
    await addObject('rex-attachments/x/anime.gif');

    const manquantes = await runScript('vignettes_manquantes');
    const noms = manquantes.map((r) => r.file_name);
    // Seule l'image aurait dû avoir une vignette : PDF et GIF n'en ont jamais.
    expect(noms).toContain('image.webp');
    expect(noms).not.toContain('doc.pdf');
    expect(noms).not.toContain('anime.gif');
  });
});
