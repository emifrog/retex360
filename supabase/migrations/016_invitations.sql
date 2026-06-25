-- ============================================================================
-- Migration 016 — Inscription sur invitation (7A) + domaines autorisés
-- ============================================================================
-- Modèle "invitation uniquement" : l'inscription publique est désactivée.
-- Un compte ne peut être créé qu'avec un lien d'invitation tokenisé émis par un
-- admin SDIS / super_admin. Le SDIS et le rôle sont pré-assignés par l'invitation.
-- `allowed_domains` est une restriction secondaire (le domaine de l'email invité
-- doit appartenir au SDIS, si des domaines sont configurés).
--
-- Sécurité : les deux tables sont gérées EXCLUSIVEMENT côté serveur via le rôle
-- service (création/lecture des invitations dans des routes contrôlées, et lecture
-- par token au moment de l'inscription — utilisateur non encore authentifié).
-- RLS activée SANS policy permissive => aucun accès via les rôles anon/authenticated.
--
-- Idempotent.

-- ---- Domaines email autorisés par SDIS ------------------------------------
CREATE TABLE IF NOT EXISTS allowed_domains (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sdis_id    UUID NOT NULL REFERENCES sdis(id) ON DELETE CASCADE,
  domain     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (domain)
);
CREATE INDEX IF NOT EXISTS idx_allowed_domains_sdis ON allowed_domains(sdis_id);
ALTER TABLE allowed_domains ENABLE ROW LEVEL SECURITY;
-- Pas de policy : accès uniquement via le rôle service (bypass RLS).

-- ---- Invitations ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  sdis_id     UUID NOT NULL REFERENCES sdis(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'user'
              CHECK (role IN ('user', 'validator', 'admin', 'super_admin')),
  token_hash  TEXT NOT NULL UNIQUE,            -- SHA-256 du token (le token brut n'est jamais stocké)
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,                      -- NULL tant que non utilisée (usage unique)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_invitations_pending
  ON invitations(email) WHERE accepted_at IS NULL;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
-- Pas de policy : accès uniquement via le rôle service (bypass RLS).
