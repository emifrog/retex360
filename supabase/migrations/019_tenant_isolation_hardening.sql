-- ============================================================================
-- Migration 019 — Durcissement isolation multi-tenant + intégrité (audit juin 2026)
-- ============================================================================
-- Corrige des trous où la frontière SDIS reposait uniquement sur le code applicatif :
--   1. `profiles` n'est plus lisible globalement (fuite PII inter-SDIS) — scopé au
--      SDIS + super_admin + auteurs de REX partagés (pour l'affichage inter-SDIS).
--   2. Un utilisateur ne peut plus changer son `role`/`sdis_id` (cross-tenant) —
--      trigger BEFORE UPDATE (les écritures service-role/onboarding restent permises).
--   3. `rex` INSERT impose `sdis_id` = SDIS de l'auteur (plus d'insertion cross-tenant).
--   4. Auto-validation bloquée : passer un REX à `validated` exige le rôle validateur+.
--   5. Notifications en double supprimées : les triggers 003 (mention/validation)
--      sont retirés (l'app les insère déjà côté serveur depuis la mig. 015).
--   6. `allowed_domains` : unicité par SDIS (un domaine peut servir plusieurs SDIS).
--   7. Index + vue d'agrégat pour la perf (compteurs par SDIS, quota mensuel).
--
-- Idempotent. Les helpers sont SECURITY DEFINER (bypass RLS) pour éviter la
-- récursion de policy sur `profiles`.

-- ---- Helpers (SECURITY DEFINER, search_path fixé) --------------------------
CREATE OR REPLACE FUNCTION current_user_sdis_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT sdis_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- Auteur d'au moins un REX partagé (inter-SDIS/public validé) — autorise
-- l'affichage de son nom hors de son SDIS sans exposer tout l'annuaire.
CREATE OR REPLACE FUNCTION is_public_rex_author(pid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM rex r
    WHERE r.author_id = pid
      AND r.visibility IN ('inter_sdis', 'public')
      AND r.status = 'validated'
  );
$$;

-- ---- 1) profiles : lecture scopée (plus de USING(true)) --------------------
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable within SDIS" ON profiles;
CREATE POLICY "Profiles viewable within SDIS" ON profiles
  FOR SELECT TO authenticated
  USING (
    sdis_id = current_user_sdis_id()
    OR current_user_is_super_admin()
    OR is_public_rex_author(id)
  );

-- ---- 2) profiles : verrou role/sdis_id pour les écritures utilisateur ------
-- auth.uid() est NULL pour le rôle service (onboarding, changement de rôle admin,
-- inscription) → ces écritures restent autorisées. Seules les écritures portant
-- un JWT utilisateur sont contraintes.
CREATE OR REPLACE FUNCTION profiles_guard_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.sdis_id IS DISTINCT FROM OLD.sdis_id) THEN
    RAISE EXCEPTION 'Modification non autorisée des champs role / sdis_id';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_guard_privileged_columns ON profiles;
CREATE TRIGGER trg_profiles_guard_privileged_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_guard_privileged_columns();

-- ---- 3) rex : INSERT impose le SDIS de l'auteur ---------------------------
DROP POLICY IF EXISTS "Users can create REX" ON rex;
CREATE POLICY "Users can create REX" ON rex
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND sdis_id = current_user_sdis_id()
  );

-- ---- 4) rex : pas d'auto-validation ---------------------------------------
CREATE OR REPLACE FUNCTION rex_guard_validation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.status = 'validated'
     AND OLD.status IS DISTINCT FROM 'validated' THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('validator', 'admin', 'super_admin')
        AND (p.role = 'super_admin' OR p.sdis_id = NEW.sdis_id)
    ) THEN
      RAISE EXCEPTION 'Validation réservée aux validateurs du SDIS';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_rex_guard_validation ON rex;
CREATE TRIGGER trg_rex_guard_validation
  BEFORE UPDATE ON rex
  FOR EACH ROW EXECUTE FUNCTION rex_guard_validation();

-- ---- 5) Suppression des notifications en double ----------------------------
-- Les triggers de 003 insèrent mention/validation EN PLUS des inserts applicatifs
-- (comments POST, validate POST) faits via le client admin depuis la mig. 015.
DROP TRIGGER IF EXISTS trigger_notify_on_mention ON comments;
DROP TRIGGER IF EXISTS trigger_notify_on_validation ON rex;

-- ---- 6) allowed_domains : unicité par SDIS --------------------------------
ALTER TABLE allowed_domains DROP CONSTRAINT IF EXISTS allowed_domains_domain_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'allowed_domains_sdis_domain_key'
  ) THEN
    ALTER TABLE allowed_domains ADD CONSTRAINT allowed_domains_sdis_domain_key UNIQUE (sdis_id, domain);
  END IF;
END $$;

-- ---- 7) Index & vue d'agrégat ---------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rex_author_id ON rex(author_id);
CREATE INDEX IF NOT EXISTS idx_rex_sdis_created_at ON rex(sdis_id, created_at DESC);

-- Compteur de REX par SDIS en une requête (remplace le N+1 du panel super_admin).
CREATE OR REPLACE VIEW rex_counts_by_sdis AS
  SELECT sdis_id, count(*)::int AS rex_count
  FROM rex
  GROUP BY sdis_id;
