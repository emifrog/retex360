-- ============================================================================
-- Migration 014 — Compte démo en LECTURE SEULE (OPTIONNELLE)
-- ============================================================================
-- À exécuter UNIQUEMENT si vous exposez publiquement les identifiants du compte
-- démo (demo@retex360.fr) — p.ex. dans le README. Les credentials étant publics,
-- seule une protection côté base empêche réellement le vandalisme du contenu
-- partagé (création de REX/commentaires parasites visibles par tous).
--
-- Principe : policies RESTRICTIVE additives. Une policy restrictive se combine
-- en ET avec les policies permissives existantes — elle ne les modifie pas et
-- n'affecte AUCUN autre utilisateur. Le rôle service (seed) bypasse la RLS.
--
-- Portée : bloque INSERT/UPDATE/DELETE sur le contenu PARTAGÉ (rex, comments,
-- rex_attachments) pour le seul compte démo. La LECTURE reste totale.
-- Les interactions auto-cantonnées (favoris, notifications, profil) restent
-- possibles pour garder une démo interactive là où c'est sans risque.
--
-- Idempotent. Pour RÉACTIVER l'écriture du compte démo : voir le bloc en bas.
--
-- NB : adaptez l'email ci-dessous si votre compte démo diffère.

-- rex -----------------------------------------------------------------------
DROP POLICY IF EXISTS "demo_readonly_rex_insert" ON rex;
CREATE POLICY "demo_readonly_rex_insert" ON rex AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

DROP POLICY IF EXISTS "demo_readonly_rex_update" ON rex;
CREATE POLICY "demo_readonly_rex_update" ON rex AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

DROP POLICY IF EXISTS "demo_readonly_rex_delete" ON rex;
CREATE POLICY "demo_readonly_rex_delete" ON rex AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

-- comments ------------------------------------------------------------------
DROP POLICY IF EXISTS "demo_readonly_comments_insert" ON comments;
CREATE POLICY "demo_readonly_comments_insert" ON comments AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

DROP POLICY IF EXISTS "demo_readonly_comments_update" ON comments;
CREATE POLICY "demo_readonly_comments_update" ON comments AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

DROP POLICY IF EXISTS "demo_readonly_comments_delete" ON comments;
CREATE POLICY "demo_readonly_comments_delete" ON comments AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

-- rex_attachments -----------------------------------------------------------
DROP POLICY IF EXISTS "demo_readonly_attachments_insert" ON rex_attachments;
CREATE POLICY "demo_readonly_attachments_insert" ON rex_attachments AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

DROP POLICY IF EXISTS "demo_readonly_attachments_delete" ON rex_attachments;
CREATE POLICY "demo_readonly_attachments_delete" ON rex_attachments AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') IS DISTINCT FROM 'demo@retex360.fr');

-- ============================================================================
-- POUR RÉACTIVER l'écriture du compte démo (annuler cette migration) :
-- ============================================================================
-- DROP POLICY IF EXISTS "demo_readonly_rex_insert" ON rex;
-- DROP POLICY IF EXISTS "demo_readonly_rex_update" ON rex;
-- DROP POLICY IF EXISTS "demo_readonly_rex_delete" ON rex;
-- DROP POLICY IF EXISTS "demo_readonly_comments_insert" ON comments;
-- DROP POLICY IF EXISTS "demo_readonly_comments_update" ON comments;
-- DROP POLICY IF EXISTS "demo_readonly_comments_delete" ON comments;
-- DROP POLICY IF EXISTS "demo_readonly_attachments_insert" ON rex_attachments;
-- DROP POLICY IF EXISTS "demo_readonly_attachments_delete" ON rex_attachments;
