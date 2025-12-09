-- ============================================
-- COMPTE DÉMO LECTURE SEULE
-- ============================================
-- Email: demo@retex360.fr
-- Mot de passe: Demo2025!
-- Rôle: user (lecture seule, pas admin)
-- ============================================

-- ÉTAPE 1: Créer l'utilisateur dans Supabase Auth
-- ⚠️ Cette étape doit être faite via l'interface Supabase Dashboard
-- ou via l'API Auth car on ne peut pas insérer directement dans auth.users
-- 
-- Allez dans: Supabase Dashboard > Authentication > Users > Add user
-- Email: demo@retex360.fr
-- Password: Demo2025!
-- Cochez "Auto Confirm User"

-- ÉTAPE 2: Une fois l'utilisateur créé, récupérez son UUID et exécutez:
-- (Remplacez 'UUID_DU_COMPTE_DEMO' par l'UUID réel)

-- Option A: Si vous connaissez l'UUID
/*
UPDATE profiles
SET 
  full_name = 'Compte Démo',
  grade = 'Visiteur',
  role = 'user',
  sdis_id = (SELECT id FROM sdis WHERE code = '75' LIMIT 1)
WHERE id = 'UUID_DU_COMPTE_DEMO';
*/

-- Option B: Mise à jour par email (recommandé)
UPDATE profiles
SET 
  full_name = 'Compte Démo',
  grade = 'Visiteur',
  role = 'user',
  sdis_id = (SELECT id FROM sdis WHERE code = '75' LIMIT 1)
WHERE email = 'demo@retex360.fr';

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.grade,
  p.role,
  s.code as sdis_code,
  s.name as sdis_name
FROM profiles p
LEFT JOIN sdis s ON p.sdis_id = s.id
WHERE p.email = 'demo@retex360.fr';

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 
-- Ce compte démo a les permissions suivantes:
-- ✅ Consulter les RETEX validés
-- ✅ Voir les détails des RETEX
-- ✅ Rechercher des RETEX
-- ✅ Voir les commentaires
-- ✅ Voir la page À propos
-- 
-- ❌ Créer des RETEX (peut créer mais en brouillon)
-- ❌ Valider/Rejeter des RETEX
-- ❌ Gérer les utilisateurs
-- ❌ Accéder aux pages admin
--
-- Pour un compte vraiment en lecture seule, vous pouvez
-- ajouter une politique RLS spécifique ou gérer côté frontend.
