-- ============================================================================
-- Migration 018 — Enforcement des abonnements (7B)
-- ============================================================================
-- S'appuie sur la table `subscriptions` (migration 017). Trois apports :
--   1. Policy SELECT : un utilisateur peut lire l'abonnement de SON SDIS
--      (bannière trial / mode lecture seule côté app).
--   2. Fonction `sdis_write_blocked()` : statut « effectif » DÉRIVÉ à la lecture
--      (pas de cron) — true si l'abonnement du SDIS de l'utilisateur courant est
--      suspendu, expiré, ou si la période d'essai / la période courante est dépassée.
--   3. Policies RESTRICTIVE : bloquent toute ÉCRITURE de contenu (rex, comments,
--      rex_attachments) quand `sdis_write_blocked()` est vrai => mode lecture seule
--      incontournable au niveau base (même mécanisme que le compte démo, mig. 014).
--
-- Le blocage TOTAL après la période de grâce (redirection) est géré côté app
-- (layout) ; ici on garantit seulement que rien ne peut être écrit.
--
-- Idempotent.

-- ---- 1) Lecture de son propre abonnement -----------------------------------
DROP POLICY IF EXISTS "Users read own SDIS subscription" ON subscriptions;
CREATE POLICY "Users read own SDIS subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING (sdis_id = (SELECT sdis_id FROM profiles WHERE id = auth.uid()));

-- ---- 2) Statut effectif dérivé (écriture bloquée ?) ------------------------
CREATE OR REPLACE FUNCTION sdis_write_blocked()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE((
    SELECT
      -- Le super_admin n'est jamais bloqué (il pilote l'onboarding) : cohérent
      -- avec l'exemption côté application (layout / routes).
      p.role <> 'super_admin'
      AND (
        s.status = 'suspended'
        OR s.status = 'expired'
        OR (s.status = 'trial'  AND s.trial_ends_at      IS NOT NULL AND s.trial_ends_at      < now())
        OR (s.status = 'active' AND s.current_period_end IS NOT NULL AND s.current_period_end < now())
      )
    FROM subscriptions s
    JOIN profiles p ON p.sdis_id = s.sdis_id
    WHERE p.id = auth.uid()
    LIMIT 1
  ), false);
$$;

-- ---- 3) Blocage des écritures de contenu en mode lecture seule -------------
-- RESTRICTIVE => combiné en AND avec les policies permissives existantes.
-- Un SDIS sans abonnement (référence non onboardée) n'est jamais bloqué.

-- REX
DROP POLICY IF EXISTS "sub_block_rex_insert" ON rex;
CREATE POLICY "sub_block_rex_insert" ON rex AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT sdis_write_blocked());
DROP POLICY IF EXISTS "sub_block_rex_update" ON rex;
CREATE POLICY "sub_block_rex_update" ON rex AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT sdis_write_blocked()) WITH CHECK (NOT sdis_write_blocked());
DROP POLICY IF EXISTS "sub_block_rex_delete" ON rex;
CREATE POLICY "sub_block_rex_delete" ON rex AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT sdis_write_blocked());

-- Commentaires
DROP POLICY IF EXISTS "sub_block_comments_insert" ON comments;
CREATE POLICY "sub_block_comments_insert" ON comments AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT sdis_write_blocked());
DROP POLICY IF EXISTS "sub_block_comments_update" ON comments;
CREATE POLICY "sub_block_comments_update" ON comments AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT sdis_write_blocked()) WITH CHECK (NOT sdis_write_blocked());
DROP POLICY IF EXISTS "sub_block_comments_delete" ON comments;
CREATE POLICY "sub_block_comments_delete" ON comments AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT sdis_write_blocked());

-- Pièces jointes
DROP POLICY IF EXISTS "sub_block_attachments_insert" ON rex_attachments;
CREATE POLICY "sub_block_attachments_insert" ON rex_attachments AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT sdis_write_blocked());
DROP POLICY IF EXISTS "sub_block_attachments_update" ON rex_attachments;
CREATE POLICY "sub_block_attachments_update" ON rex_attachments AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT sdis_write_blocked()) WITH CHECK (NOT sdis_write_blocked());
DROP POLICY IF EXISTS "sub_block_attachments_delete" ON rex_attachments;
CREATE POLICY "sub_block_attachments_delete" ON rex_attachments AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT sdis_write_blocked());
