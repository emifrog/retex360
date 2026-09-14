-- ============================================================================
-- Harnais de test RLS — surface Supabase minimale
-- ============================================================================
-- Les migrations sont écrites pour Supabase, qui fournit d'office : les rôles
-- `anon` / `authenticated` / `service_role`, le schéma `auth` (`uid()`, `jwt()`),
-- le schéma `storage`, et l'extension `vector`.
--
-- Un Postgres nu n'a rien de tout ça. Ce fichier reconstitue le strict
-- nécessaire pour que les 21 migrations s'appliquent et que les policies
-- s'évaluent comme en production. Il n'est JAMAIS appliqué à une vraie base :
-- il ne sert qu'au harnais de test (voir src/__tests__/rls/harness.ts).
--
-- Ce qui est fidèle : les rôles, `auth.uid()`, `auth.jwt()`, l'évaluation des
-- policies (permissives en OR, restrictives en AND), le comportement d'une
-- écriture bloquée (0 ligne, pas d'erreur).
-- Ce qui est approximé : `vector` (domaine `real[]`, aucune policy ne s'en sert)
-- et `storage` (tables nues, suffisant pour la migration 012).

-- ---- Rôles -----------------------------------------------------------------
-- NOINHERIT : `authenticated` ne doit hériter d'aucun privilège du propriétaire,
-- sinon la RLS serait contournée et les tests passeraient à vide.
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

-- ---- Schéma auth -----------------------------------------------------------
CREATE SCHEMA auth;

-- Supabase lit l'identité dans les claims du JWT ; ici on les injecte par
-- `set_config()`, ce qui donne exactement la même sémantique côté policy.
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
$$;

-- `profiles.id` référence `auth.users(id)` (migration 001). Table minimale :
-- seule la clé primaire est utilisée par la contrainte.
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- ---- Type vector (approximation) -------------------------------------------
-- `rex.embedding` est déclaré `VECTOR(1536)` (migration 001). Aucune policy ne
-- le référence : un domaine sur `real[]` suffit à faire passer le DDL.
-- Le harnais réécrit `VECTOR(n)` en `vector` (les domaines n'ont pas de typmod).
CREATE DOMAIN vector AS real[];

-- ---- Schéma storage --------------------------------------------------------
CREATE SCHEMA storage;

CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false
);

CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Supabase : renvoie les segments de chemin SANS le nom de fichier.
-- 'rex-attachments/<uid>/f.webp' -> {rex-attachments, <uid>}
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
$$;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- ---- Privilèges par défaut -------------------------------------------------
-- Supabase accorde le DML à `anon` / `authenticated` / `service_role` AVANT que
-- les migrations ne tournent : les tables naissent accessibles, et c'est la RLS
-- qui autorise. `ALTER DEFAULT PRIVILEGES` reproduit cet ORDRE, ce qu'un GRANT
-- global appliqué après les migrations ne fait pas.
--
-- L'ordre compte depuis la migration 024, qui RESTREINT un privilège de colonne
-- (`profiles.email`). Un `GRANT SELECT ON ALL TABLES` joué après elle
-- l'annulerait en silence, et le test de confidentialité passerait au vert sans
-- rien prouver.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
