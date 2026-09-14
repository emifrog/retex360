-- ============================================================================
-- Harnais de test RLS — privilèges de table (appliqué APRÈS les migrations)
-- ============================================================================
-- Supabase accorde d'office le DML complet à `authenticated` sur `public` et
-- s'en remet entièrement à la RLS pour l'autorisation. Sans ces privilèges,
-- chaque requête échouerait en « permission denied » (42501) AVANT même
-- l'évaluation des policies — les tests seraient verts pour la mauvaise raison,
-- ou rouges sans rapport avec ce qu'ils prétendent vérifier.
--
-- C'est la RLS, et elle seule, qui doit trancher dans ces tests.
--
-- Les privilèges sur les tables de `public` ne sont PAS accordés ici mais dans
-- bootstrap.sql, par `ALTER DEFAULT PRIVILEGES`, donc AVANT les migrations —
-- comme chez Supabase. Un GRANT global rejoué ici écraserait les restrictions
-- qu'une migration a délibérément posées (cf. `profiles.email`, migration 024).

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role;
GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
