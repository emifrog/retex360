-- ============================================================================
-- Réconciliation des pièces jointes — base ↔ Supabase Storage
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Backend : Supabase Storage.
-- (Si `SCALEWAY_S3_*` est configuré en production, les objets sont chez Scaleway
--  et `storage.objects` est vide ou obsolète : ce script ne s'applique PAS.
--  Vérifiez d'abord les variables d'environnement du déploiement.)
--
-- ----------------------------------------------------------------------------
-- POURQUOI
-- ----------------------------------------------------------------------------
-- Jusqu'à la migration 020, `rex_attachments` n'avait aucune policy DELETE
-- permissive. La route de suppression purgeait l'objet du storage (rôle service,
-- qui contourne la RLS) PUIS supprimait la ligne sous RLS — laquelle refusait,
-- en renvoyant 0 ligne SANS erreur. Résultat, à chaque suppression de pièce
-- jointe : le fichier est parti pour de bon, la ligne est restée.
--
-- Ces lignes « fantômes » se voient dans l'application sous forme de vignettes
-- cassées et d'URL signées en 404. Elles ne disparaîtront pas d'elles-mêmes.
--
-- ----------------------------------------------------------------------------
-- CE QUE FAIT CE SCRIPT
-- ----------------------------------------------------------------------------
-- Les sections 1 à 4 sont en LECTURE SEULE : lancez-les, lisez, décidez.
-- La section 5 est le nettoyage, à décommenter explicitement, et elle archive
-- avant de supprimer. Un script de réparation écrit à la suite d'un incident de
-- destruction ne doit pas pouvoir détruire à son tour par inadvertance.
--
-- ----------------------------------------------------------------------------
-- RAPPELS DE STRUCTURE (vérifiés dans le code, pas supposés)
-- ----------------------------------------------------------------------------
--  * `rex_attachments.storage_path` vaut `rex-attachments/<user_id>/<fichier>`
--    et sert de clé d'objet DANS le bucket `rex-attachments` : le nom du bucket
--    est donc dupliqué en premier segment. Le rapprochement se fait sur
--    `storage.objects.name = rex_attachments.storage_path`.
--  * Les VIGNETTES (`<base>_thumb.webp`) existent dans le storage mais ne sont
--    JAMAIS enregistrées en base. Un rapprochement naïf les signalerait toutes
--    comme orphelines : elles sont explicitement exclues.
--  * Les vignettes ne sont générées que pour les images (ni GIF, ni PDF).

-- ============================================================================
-- Section 0 — Vues de travail
-- ============================================================================
DROP VIEW IF EXISTS _recon_objects CASCADE;
CREATE TEMP VIEW _recon_objects AS
  SELECT name FROM storage.objects WHERE bucket_id = 'rex-attachments';

DROP VIEW IF EXISTS _recon_expected CASCADE;
CREATE TEMP VIEW _recon_expected AS
  SELECT
    a.id,
    a.storage_path,
    regexp_replace(a.storage_path, '\.[^.]+$', '_thumb.webp') AS thumb_path
  FROM rex_attachments a;

-- ============================================================================
-- Section 1 — Synthèse
-- ============================================================================
-- Chaque section porte une colonne `section` : le SQL Editor affiche plusieurs
-- jeux de résultats à la suite, sans titre, et deux d'entre eux partagent des
-- noms de colonnes. Le marqueur évite de lire la mauvaise liste avant de
-- supprimer — et permet de cibler la bonne section par script.
SELECT
  'synthese'::text                                                        AS section,
  (SELECT count(*) FROM rex_attachments)                                  AS lignes_en_base,
  (SELECT count(*) FROM _recon_objects)                                   AS objets_dans_le_bucket,
  (SELECT count(*) FROM _recon_expected e
     WHERE NOT EXISTS (SELECT 1 FROM _recon_objects o WHERE o.name = e.storage_path))
                                                                          AS lignes_fantomes,
  (SELECT count(*) FROM _recon_objects o
     WHERE NOT EXISTS (SELECT 1 FROM _recon_expected e
                       WHERE e.storage_path = o.name OR e.thumb_path = o.name))
                                                                          AS objets_orphelins;

-- ============================================================================
-- Section 2 — Lignes fantômes : la ligne existe, le fichier a disparu
-- ============================================================================
-- C'est le dégât direct du défaut. Les colonnes REX / auteur permettent de
-- prévenir les agents concernés avant de supprimer quoi que ce soit.
SELECT
  'lignes_fantomes'::text AS section,
  a.id            AS attachment_id,
  a.file_name,
  a.created_at,
  a.storage_path,
  r.id            AS rex_id,
  r.title         AS rex_titre,
  r.status        AS rex_statut,
  s.code          AS sdis,
  p.full_name     AS deposant,
  p.email         AS deposant_email
FROM rex_attachments a
LEFT JOIN rex      r ON r.id = a.rex_id
LEFT JOIN sdis     s ON s.id = r.sdis_id
LEFT JOIN profiles p ON p.id = a.uploaded_by
WHERE NOT EXISTS (
  SELECT 1 FROM _recon_objects o WHERE o.name = a.storage_path
)
ORDER BY s.code NULLS LAST, r.title NULLS LAST, a.created_at;

-- ============================================================================
-- Section 3 — Objets orphelins : le fichier existe, aucune ligne ne le réclame
-- ============================================================================
-- Sans gravité fonctionnelle (stockage gaspillé), mais révélateur : des dépôts
-- jamais rattachés, ou des lignes supprimées correctement sans purge du fichier.
--
-- ⚠️ NE SUPPRIMEZ PAS ces objets par un DELETE sur `storage.objects` : cela
-- retirerait la métadonnée en laissant le blob dans S3. La suppression doit
-- passer par l'API Storage (`storage.from('rex-attachments').remove([...])`).
SELECT
  'objets_orphelins'::text AS section,
  o.name AS objet,
  CASE WHEN o.name LIKE '%\_thumb.webp' THEN 'vignette' ELSE 'original' END AS nature
FROM _recon_objects o
WHERE NOT EXISTS (
  SELECT 1 FROM _recon_expected e
  WHERE e.storage_path = o.name OR e.thumb_path = o.name
)
ORDER BY o.name;

-- ============================================================================
-- Section 4 — Vignettes manquantes (cosmétique)
-- ============================================================================
-- L'original est là, la vignette non : l'affichage retombe sur l'image pleine.
-- Attendu pour les PDF et les GIF, qui n'en ont jamais eu — d'où le filtre.
SELECT
  'vignettes_manquantes'::text AS section,
  a.id AS attachment_id,
  a.file_name,
  a.storage_path
FROM rex_attachments a
JOIN _recon_expected e ON e.id = a.id
WHERE EXISTS (SELECT 1 FROM _recon_objects o WHERE o.name = e.storage_path)
  AND NOT EXISTS (SELECT 1 FROM _recon_objects o WHERE o.name = e.thumb_path)
  AND a.file_type NOT IN ('application/pdf', 'image/gif')
ORDER BY a.created_at;

-- ============================================================================
-- Section 5 — Nettoyage des lignes fantômes  (DÉCOMMENTER POUR APPLIQUER)
-- ============================================================================
-- Ne touche QUE `rex_attachments`, et uniquement des lignes dont le fichier est
-- déjà irrécupérable : rien de récupérable n'est détruit ici. La métadonnée est
-- archivée d'abord — elle documente l'incident et permet de recontacter les
-- auteurs après coup.
--
-- Relancez les sections 1 et 2 après application : elles doivent renvoyer 0.

-- BEGIN;
--
-- CREATE TABLE IF NOT EXISTS rex_attachments_phantom_backup (
--   LIKE rex_attachments INCLUDING ALL
-- );
-- ALTER TABLE rex_attachments_phantom_backup
--   ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT now();
--
-- INSERT INTO rex_attachments_phantom_backup
--   SELECT a.*, now()
--   FROM rex_attachments a
--   WHERE NOT EXISTS (
--     SELECT 1 FROM storage.objects o
--     WHERE o.bucket_id = 'rex-attachments' AND o.name = a.storage_path
--   )
--   ON CONFLICT (id) DO NOTHING;
--
-- DELETE FROM rex_attachments a
--  WHERE NOT EXISTS (
--    SELECT 1 FROM storage.objects o
--    WHERE o.bucket_id = 'rex-attachments' AND o.name = a.storage_path
--  )
--  RETURNING a.id, a.file_name, a.storage_path;
--
-- -- Relisez le RETURNING avant de valider.
-- COMMIT;   -- ou ROLLBACK;
