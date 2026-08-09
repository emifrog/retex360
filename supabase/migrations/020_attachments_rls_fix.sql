-- ============================================================================
-- Migration 020 — Correction RLS `rex_attachments` (policies manquantes)
-- ============================================================================
-- Depuis la 001, `rex_attachments` n'a QUE deux policies permissives (SELECT et
-- INSERT). Les migrations 014 et 018 n'ajoutent que des policies RESTRICTIVE —
-- qui restreignent en AND, mais n'accordent jamais de droit. Avec la RLS active,
-- `UPDATE` et `DELETE` étaient donc refusés à TOUT LE MONDE, et l'INSERT était
-- impossible pour une pièce jointe pas encore rattachée à un REX.
--
-- Trois conséquences, toutes silencieuses (PostgREST ne renvoie PAS d'erreur
-- quand la RLS réduit le résultat à 0 ligne — il renvoie un succès vide) :
--
--   1. INSERT refusé au dépôt initial : à la création d'un REX, le fichier est
--      envoyé AVANT que le REX existe (`rex_id IS NULL`). L'ancienne WITH CHECK
--      `EXISTS (SELECT 1 FROM rex WHERE rex.id = rex_id AND author_id = auth.uid())`
--      est fausse quand `rex_id` est NULL => aucune pièce jointe créable.
--   2. UPDATE refusé : `POST /api/rex` rattache ensuite les pièces jointes via
--      `update({ rex_id })`. 0 ligne modifiée, aucune erreur => PJ orphelines.
--   3. DELETE refusé : `DELETE /api/rex/attachments/[id]` supprimait l'objet du
--      storage (service role, bypass RLS) PUIS la ligne en base. La ligne
--      survivait, le fichier non => lignes fantômes pointant dans le vide.
--      (L'ordre des opérations est corrigé côté application dans le même lot.)
--
-- Cette migration remplace les policies SELECT/INSERT et ajoute UPDATE/DELETE.
-- Modèle d'autorisation retenu :
--   * SELECT   : ses propres dépôts (y compris non rattachés) + tout ce dont le
--                REX parent est visible (hérite de la RLS de `rex`).
--   * INSERT   : on ne peut déposer que pour soi, sur un REX dont on est l'auteur
--                (ou sans REX : dépôt en attente de rattachement).
--   * UPDATE   : rattachement de ses propres dépôts à un REX dont on est l'auteur.
--   * DELETE   : le déposant, l'auteur du REX parent, ou un admin du même SDIS
--                (super_admin transverse) — aligné sur la policy DELETE de `rex`
--                (migration 013).
--
-- Idempotent.

-- ---- Helper (SECURITY DEFINER, search_path fixé) ---------------------------
-- Donne le SDIS du REX parent sans passer par la RLS de `rex` : un admin doit
-- pouvoir supprimer la pièce jointe d'un REX de son SDIS même s'il ne peut pas
-- le lire (brouillon d'un autre agent). Même parti pris que les helpers de 019.
CREATE OR REPLACE FUNCTION rex_sdis_id(rid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT sdis_id FROM rex WHERE id = rid;
$$;

-- ---- 1) SELECT -------------------------------------------------------------
-- La branche `uploaded_by = auth.uid()` est indispensable : sans elle, le
-- `INSERT ... RETURNING` de la route d'upload (`.insert().select().single()`)
-- échoue sur un dépôt non rattaché, la ligne insérée n'étant pas re-lisible.
DROP POLICY IF EXISTS "Attachments follow REX visibility" ON rex_attachments;
CREATE POLICY "Attachments follow REX visibility" ON rex_attachments
  FOR SELECT TO authenticated USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM rex WHERE rex.id = rex_attachments.rex_id)
  );

-- ---- 2) INSERT -------------------------------------------------------------
-- `uploaded_by = auth.uid()` est un durcissement : l'ancienne policy ne
-- contraignait pas la colonne, on pouvait déposer au nom d'un autre.
DROP POLICY IF EXISTS "Users can upload to own REX" ON rex_attachments;
DROP POLICY IF EXISTS "Users can upload attachments" ON rex_attachments;
CREATE POLICY "Users can upload attachments" ON rex_attachments
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      rex_attachments.rex_id IS NULL
      OR EXISTS (
        SELECT 1 FROM rex
        WHERE rex.id = rex_attachments.rex_id AND rex.author_id = auth.uid()
      )
    )
  );

-- ---- 3) UPDATE -------------------------------------------------------------
-- Sert au rattachement post-création (`update({ rex_id })`). On ne peut
-- rattacher que SES dépôts, et uniquement à un REX dont on est l'auteur.
DROP POLICY IF EXISTS "Users can link own attachments" ON rex_attachments;
CREATE POLICY "Users can link own attachments" ON rex_attachments
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      rex_attachments.rex_id IS NULL
      OR EXISTS (
        SELECT 1 FROM rex
        WHERE rex.id = rex_attachments.rex_id AND rex.author_id = auth.uid()
      )
    )
  );

-- ---- 4) DELETE -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete own attachments" ON rex_attachments;
CREATE POLICY "Users can delete own attachments" ON rex_attachments
  FOR DELETE TO authenticated USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM rex
      WHERE rex.id = rex_attachments.rex_id AND rex.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
        AND (p.role = 'super_admin' OR p.sdis_id = rex_sdis_id(rex_attachments.rex_id))
    )
  );

-- ---- 5) Compte démo : bloquer aussi l'UPDATE -------------------------------
-- La 014 ne couvrait pas l'UPDATE de `rex_attachments` (inutile à l'époque :
-- l'UPDATE était refusé à tous). Maintenant qu'il est ouvert, on complète.
DROP POLICY IF EXISTS "demo_readonly_attachments_update" ON rex_attachments;
CREATE POLICY "demo_readonly_attachments_update" ON rex_attachments AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

-- ---- 6) Index --------------------------------------------------------------
-- Les quatre policies filtrent sur `uploaded_by`.
CREATE INDEX IF NOT EXISTS idx_rex_attachments_uploaded_by
  ON rex_attachments(uploaded_by);
