-- ============================================================================
-- Migration 017 — Abonnements par SDIS + audit super_admin (7C / 7B #51)
-- ============================================================================
-- Pose le socle de données de l'onboarding super_admin :
--   * `subscriptions`   : un abonnement par SDIS (plan, statut, période, limites).
--                          Modèle de 7B #51, posé dès maintenant pour que 7C
--                          puisse afficher/éditer plan, dates, expiration et MRR.
--                          L'ENFORCEMENT (middleware abonnement, lecture seule,
--                          limites par plan) reste à câbler en 7B.
--   * `admin_audit_log` : trace des actions super_admin (qui a fait quoi, quand).
--   * `sdis`            : colonnes `departement` + `logo_url` (infos onboarding).
--
-- Sécurité : `subscriptions` et `admin_audit_log` sont gérées EXCLUSIVEMENT côté
-- serveur via le rôle service. RLS activée SANS policy permissive => aucun accès
-- via les rôles anon/authenticated (même convention que la migration 016).
--
-- Idempotent.

-- ---- Colonnes onboarding sur SDIS -----------------------------------------
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS departement VARCHAR(10);
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ---- Abonnements (un par SDIS) --------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sdis_id              UUID NOT NULL UNIQUE REFERENCES sdis(id) ON DELETE CASCADE,
  plan                 TEXT NOT NULL DEFAULT 'essentiel'
                       CHECK (plan IN ('essentiel', 'reseau', 'premium')),
  status               TEXT NOT NULL DEFAULT 'trial'
                       CHECK (status IN ('trial', 'active', 'suspended', 'expired')),
  suspended_reason     TEXT,
  trial_ends_at        TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  max_users            INTEGER,   -- NULL = illimité
  max_rex_per_month    INTEGER,   -- NULL = illimité
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- Pas de policy : accès uniquement via le rôle service (bypass RLS).
-- 7B ajoutera une policy de lecture « son propre SDIS » pour la bannière trial.

-- ---- Journal d'audit des actions super_admin ------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email  TEXT,                 -- snapshot dénormalisé (survit à la suppression du profil)
  action       TEXT NOT NULL,        -- ex. 'sdis.onboard', 'sdis.suspend', 'sdis.plan_change'
  target_type  TEXT,                 -- ex. 'sdis', 'subscription', 'profile'
  target_id    UUID,
  target_label TEXT,                 -- libellé lisible (ex. code/nom SDIS)
  details      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON admin_audit_log(actor_id);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Pas de policy : accès uniquement via le rôle service (bypass RLS).
