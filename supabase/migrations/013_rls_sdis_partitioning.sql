-- Migration 013 — Cloisonnement RLS par SDIS + durcissements
--
-- Corrige plusieurs policies trop permissives de 001 :
--  * un validateur/admin voyait et modifiait les REX `pending` de TOUS les SDIS ;
--  * un utilisateur pouvait commenter un REX qu'il n'a pas le droit de voir ;
--  * l'auteur ne pouvait pas supprimer son propre REX (policy DELETE = admins only) ;
--  * `profiles INSERT` était ouvert à tous (WITH CHECK (true)).
-- Et fixe `search_path` sur les fonctions SECURITY DEFINER de 003.
--
-- Idempotent : ré-exécutable (DROP POLICY IF EXISTS avant chaque CREATE).
-- Note : `super_admin` reste transverse (tous SDIS) ; `validator`/`admin` sont
-- limités à leur propre SDIS.

-- ============================================================
-- REX — visibilité (SELECT) : valideurs/admins limités à leur SDIS
-- ============================================================
DROP POLICY IF EXISTS "REX viewable based on visibility" ON rex;
CREATE POLICY "REX viewable based on visibility" ON rex
  FOR SELECT TO authenticated USING (
    author_id = auth.uid()
    OR (status = 'validated' AND (
      visibility = 'public'
      OR visibility = 'inter_sdis'
      OR (visibility = 'sdis' AND sdis_id = (SELECT sdis_id FROM profiles WHERE id = auth.uid()))
    ))
    OR (status = 'pending' AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('validator', 'admin', 'super_admin')
        AND (p.role = 'super_admin' OR p.sdis_id = rex.sdis_id)
    ))
  );

-- ============================================================
-- REX — modification (UPDATE) : auteur, ou valideur/admin du même SDIS
-- ============================================================
DROP POLICY IF EXISTS "Users can update own REX" ON rex;
CREATE POLICY "Users can update own REX" ON rex
  FOR UPDATE TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('validator', 'admin', 'super_admin')
        AND (p.role = 'super_admin' OR p.sdis_id = rex.sdis_id)
    )
  );

-- ============================================================
-- REX — suppression (DELETE) : auteur, ou admin du même SDIS (super_admin: tous)
-- (corrige aussi l'incapacité de l'auteur à supprimer son propre REX)
-- ============================================================
DROP POLICY IF EXISTS "Admins can delete REX" ON rex;
CREATE POLICY "Admins can delete REX" ON rex
  FOR DELETE TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
        AND (p.role = 'super_admin' OR p.sdis_id = rex.sdis_id)
    )
  );

-- ============================================================
-- Commentaires — INSERT seulement sur un REX visible par l'utilisateur
-- (le sous-SELECT s'exécute sous la RLS de `rex`, donc vrai uniquement si visible)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can comment" ON comments;
CREATE POLICY "Authenticated users can comment" ON comments
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM rex WHERE rex.id = rex_id)
  );

-- ============================================================
-- Profils — INSERT restreint à sa propre ligne
-- (l'inscription crée le profil via le service role, qui contourne la RLS,
--  donc ce durcissement ne casse pas l'enregistrement)
-- ============================================================
DROP POLICY IF EXISTS "Service can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- Fonctions SECURITY DEFINER (003) — fixer search_path
-- (évite le détournement via un schéma utilisateur ; `public` reste pour les tables)
-- ============================================================
ALTER FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID)
  SET search_path = pg_catalog, public;
ALTER FUNCTION notify_on_mention() SET search_path = pg_catalog, public;
ALTER FUNCTION notify_on_validation() SET search_path = pg_catalog, public;

-- Suivi (hors périmètre de cette migration) : `notifications INSERT` reste
-- WITH CHECK (true) car les flux commentaire/validation insèrent pour autrui via
-- le client utilisateur. Mitigé applicativement (vérification d'existence des
-- mentions + commentaire seulement sur REX visible). Pour verrouiller côté DB,
-- router ces insertions via la fonction SECURITY DEFINER `create_notification`.
