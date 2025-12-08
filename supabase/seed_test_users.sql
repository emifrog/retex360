-- ============================================
-- SCRIPT D'INSERTION DES UTILISATEURS DE TEST
-- ============================================
-- 
-- IMPORTANT: Ce script crée uniquement les PROFILS dans la table profiles.
-- Les comptes d'authentification doivent être créés AVANT via :
--   1. L'interface Supabase Dashboard (Authentication > Users > Add User)
--   2. Ou via l'API Supabase Auth
--
-- Après création des comptes auth, récupérez les UUIDs et mettez-les ci-dessous.
--
-- Mot de passe suggéré pour tous les comptes de test : Test123!
-- ============================================

DO $$
DECLARE
  sdis_06 UUID;
  sdis_83 UUID;
  sdis_13 UUID;
BEGIN
  -- Récupérer les IDs des SDIS
  SELECT id INTO sdis_06 FROM sdis WHERE code = '06';
  SELECT id INTO sdis_83 FROM sdis WHERE code = '83';
  SELECT id INTO sdis_13 FROM sdis WHERE code = '13';

  -- Si SDIS 06 n'existe pas, le créer
  IF sdis_06 IS NULL THEN
    INSERT INTO sdis (code, name, region, department)
    VALUES ('06', 'SDIS des Alpes-Maritimes', 'Provence-Alpes-Côte d''Azur', 'Alpes-Maritimes')
    RETURNING id INTO sdis_06;
  END IF;

  -- Si SDIS 83 n'existe pas, le créer
  IF sdis_83 IS NULL THEN
    INSERT INTO sdis (code, name, region, department)
    VALUES ('83', 'SDIS du Var', 'Provence-Alpes-Côte d''Azur', 'Var')
    RETURNING id INTO sdis_83;
  END IF;

  -- Si SDIS 13 n'existe pas, le créer
  IF sdis_13 IS NULL THEN
    INSERT INTO sdis (code, name, region, department)
    VALUES ('13', 'SDIS des Bouches-du-Rhône', 'Provence-Alpes-Côte d''Azur', 'Bouches-du-Rhône')
    RETURNING id INTO sdis_13;
  END IF;

  RAISE NOTICE 'SDIS créés/vérifiés : 06=%, 83=%, 13=%', sdis_06, sdis_83, sdis_13;

  -- ============================================
  -- MISE À JOUR DU PROFIL EXISTANT (admin06@sdis06.fr)
  -- ============================================
  -- Mettre à jour le rôle de l'utilisateur existant en super_admin
  UPDATE profiles 
  SET 
    role = 'super_admin',
    full_name = COALESCE(full_name, 'Super Administrateur'),
    grade = COALESCE(grade, 'Administrateur')
  WHERE email = 'admin06@sdis06.fr';

  RAISE NOTICE 'Profil admin06@sdis06.fr mis à jour en super_admin';

END $$;

-- ============================================
-- INSTRUCTIONS POUR CRÉER LES AUTRES UTILISATEURS
-- ============================================
--
-- 1. Allez dans Supabase Dashboard > Authentication > Users
-- 2. Cliquez sur "Add User" > "Create New User"
-- 3. Créez les utilisateurs suivants :
--
--    Email: agent@sdis06.fr
--    Password: Test123!
--    
--    Email: validateur@sdis06.fr
--    Password: Test123!
--    
--    Email: admin@sdis06.fr
--    Password: Test123!
--
-- 4. Après création, exécutez le script ci-dessous en remplaçant
--    les UUIDs par ceux générés par Supabase Auth
-- ============================================

-- ============================================
-- MISE À JOUR DES PROFILS EXISTANTS PAR EMAIL
-- ============================================
-- Ce script met à jour les profils des utilisateurs qui se sont 
-- déjà inscrits via l'interface de l'application.
-- 
-- Inscrivez d'abord les utilisateurs via https://retex360.vercel.app/register
-- puis exécutez ce script pour leur attribuer les bons rôles.

DO $$
DECLARE
  sdis_06 UUID;
BEGIN
  SELECT id INTO sdis_06 FROM sdis WHERE code = '06';

  -- Agent SDIS (Utilisateur standard)
  UPDATE profiles 
  SET 
    role = 'user',
    full_name = 'Sergent Pierre Martin',
    grade = 'Sergent'
  WHERE email = 'agent@sdis06.fr';
  
  IF FOUND THEN
    RAISE NOTICE 'Profil agent@sdis06.fr mis à jour en user';
  ELSE
    RAISE NOTICE 'Profil agent@sdis06.fr non trouvé - créez le compte via /register';
  END IF;

  -- Validateur (Officier désigné)
  UPDATE profiles 
  SET 
    role = 'validator',
    full_name = 'Capitaine Sophie Dubois',
    grade = 'Capitaine'
  WHERE email = 'validateur@sdis06.fr';
  
  IF FOUND THEN
    RAISE NOTICE 'Profil validateur@sdis06.fr mis à jour en validator';
  ELSE
    RAISE NOTICE 'Profil validateur@sdis06.fr non trouvé - créez le compte via /register';
  END IF;

  -- Admin SDIS (Administrateur local)
  UPDATE profiles 
  SET 
    role = 'admin',
    full_name = 'Commandant Jean Bernard',
    grade = 'Commandant'
  WHERE email = 'admin@sdis06.fr';
  
  IF FOUND THEN
    RAISE NOTICE 'Profil admin@sdis06.fr mis à jour en admin';
  ELSE
    RAISE NOTICE 'Profil admin@sdis06.fr non trouvé - créez le compte via /register';
  END IF;

  RAISE NOTICE 'Script terminé !';

END $$;


-- ============================================
-- VÉRIFICATION DES UTILISATEURS
-- ============================================
-- Exécutez cette requête pour voir tous les utilisateurs et leurs rôles :
--
-- SELECT 
--   p.email,
--   p.full_name,
--   p.grade,
--   p.role,
--   s.code as sdis_code,
--   s.name as sdis_name
-- FROM profiles p
-- LEFT JOIN sdis s ON p.sdis_id = s.id
-- ORDER BY 
--   CASE p.role 
--     WHEN 'super_admin' THEN 1 
--     WHEN 'admin' THEN 2 
--     WHEN 'validator' THEN 3 
--     ELSE 4 
--   END;

-- ============================================
-- RÉSUMÉ DES RÔLES
-- ============================================
-- 
-- | Rôle        | Permissions                                    |
-- |-------------|------------------------------------------------|
-- | user        | Lecture, création REX, commentaires            |
-- | validator   | + Validation/rejet des REX                     |
-- | admin       | + Gestion utilisateurs SDIS, statistiques      |
-- | super_admin | Accès total, gestion de tous les SDIS          |
--
