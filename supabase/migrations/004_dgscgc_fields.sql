-- Migration: Alignement avec le mémento DGSCGC (septembre 2022)
-- Cette migration ajoute les champs officiels définis dans l'Annexe F du mémento
-- et implémente le workflow à 3 niveaux de production (Signalement → PEX → RETEX)

-- ============================================================================
-- PARTIE 1: Type ENUM pour le niveau de production
-- ============================================================================

-- Créer le type enum pour les niveaux de production
CREATE TYPE production_type AS ENUM ('signalement', 'pex', 'retex');

-- Commentaire sur le type
COMMENT ON TYPE production_type IS 'Niveaux de production selon le mémento DGSCGC: signalement (immédiat), pex (< 3 mois), retex (6-12 mois)';

-- ============================================================================
-- PARTIE 2: Ajout des nouveaux champs à la table rex
-- ============================================================================

-- Champ type_production avec valeur par défaut 'retex' pour la rétrocompatibilité
ALTER TABLE rex ADD COLUMN IF NOT EXISTS type_production production_type NOT NULL DEFAULT 'retex';
COMMENT ON COLUMN rex.type_production IS 'Niveau de production du document: signalement (remontée rapide), pex (partage d''expérience), retex (analyse complète)';

-- Message d'ambiance (perception du premier COS)
ALTER TABLE rex ADD COLUMN IF NOT EXISTS message_ambiance text;
COMMENT ON COLUMN rex.message_ambiance IS 'Perception du premier COS à son arrivée, "bande sons" ou expression de sa perception SLLX';

-- SITAC (situation tactique)
ALTER TABLE rex ADD COLUMN IF NOT EXISTS sitac text;
COMMENT ON COLUMN rex.sitac IS 'Description de la situation tactique, cartographie, représentation schématique du bâtiment';

-- Éléments favorables (remplace partiellement "difficultés")
ALTER TABLE rex ADD COLUMN IF NOT EXISTS elements_favorables text;
COMMENT ON COLUMN rex.elements_favorables IS 'Éléments facilitateurs pour la gestion de l''intervention';

-- Éléments défavorables
ALTER TABLE rex ADD COLUMN IF NOT EXISTS elements_defavorables text;
COMMENT ON COLUMN rex.elements_defavorables IS 'Éléments perturbateurs et déstabilisants pour la gestion de l''intervention';

-- Documentation opérationnelle (références bibliographiques)
ALTER TABLE rex ADD COLUMN IF NOT EXISTS documentation_operationnelle text;
COMMENT ON COLUMN rex.documentation_operationnelle IS 'Références bibliographiques: GNR, GDO, GTO, RO, etc.';

-- Focus thématiques (structure JSONB)
ALTER TABLE rex ADD COLUMN IF NOT EXISTS focus_thematiques jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN rex.focus_thematiques IS 'Tableau de focus thématiques avec structure: [{theme, problematique, actions_menees, axes_amelioration}]';

-- ============================================================================
-- PARTIE 3: Index pour optimiser les recherches
-- ============================================================================

-- Index sur le type de production pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_rex_type_production ON rex(type_production);

-- Index GIN sur les focus thématiques pour recherche dans le JSONB
CREATE INDEX IF NOT EXISTS idx_rex_focus_thematiques ON rex USING GIN (focus_thematiques);

-- ============================================================================
-- PARTIE 4: Contrainte de validation pour les focus thématiques
-- ============================================================================

-- Fonction de validation des focus thématiques
CREATE OR REPLACE FUNCTION validate_focus_thematiques()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que focus_thematiques est un tableau valide
  IF NEW.focus_thematiques IS NOT NULL AND jsonb_typeof(NEW.focus_thematiques) != 'array' THEN
    RAISE EXCEPTION 'focus_thematiques doit être un tableau JSON';
  END IF;
  
  -- Pour les RETEX, vérifier qu'il y a au moins un focus thématique
  -- (Cette règle est appliquée côté application pour plus de flexibilité)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger de validation
DROP TRIGGER IF EXISTS trigger_validate_focus_thematiques ON rex;
CREATE TRIGGER trigger_validate_focus_thematiques
  BEFORE INSERT OR UPDATE ON rex
  FOR EACH ROW
  EXECUTE FUNCTION validate_focus_thematiques();

-- ============================================================================
-- PARTIE 5: Migration des données existantes
-- ============================================================================

-- Les REX existants sont considérés comme des RETEX complets (valeur par défaut)
-- Aucune migration de données nécessaire car DEFAULT 'retex' est appliqué

-- ============================================================================
-- PARTIE 6: Mise à jour des politiques RLS (si nécessaire)
-- ============================================================================

-- Les politiques RLS existantes s'appliquent automatiquement aux nouveaux champs
-- car elles sont basées sur les lignes et non sur les colonnes

-- ============================================================================
-- NOTES D'IMPLÉMENTATION
-- ============================================================================

-- Thèmes prédéfinis pour les focus (à gérer côté application):
-- - Soutien Sanitaire Opérationnel (SSO)
-- - Gestion incendie
-- - Sauvetage des victimes
-- - Alimentation en eau
-- - Commandement
-- - Transmissions
-- - Logistique
-- - Relations interservices
-- - Autre (personnalisable)

-- Champs requis selon le niveau de production (à gérer côté application):
-- SIGNALEMENT: titre, date_intervention, type, description
-- PEX: + contexte, moyens_engages, enseignements, elements_favorables/defavorables (opt)
-- RETEX: + message_ambiance, sitac, focus_thematiques (min 1), documentation_operationnelle
