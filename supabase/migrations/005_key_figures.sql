-- Migration: Chiffres clés de l'intervention
-- Ajoute les données quantitatives essentielles pour chaque REX

-- ============================================================================
-- PARTIE 1: Ajout du champ key_figures (JSONB)
-- ============================================================================

-- Structure attendue:
-- {
--   "nb_sp_engages": number,           -- Nombre de sapeurs-pompiers engagés
--   "duree_intervention": string,      -- Durée au format "HH:MM" ou texte libre
--   "nb_vehicules": number,            -- Nombre de véhicules engagés
--   "bilan_humain": {
--     "victimes_decedees": number,
--     "victimes_urgence_absolue": number,
--     "victimes_urgence_relative": number,
--     "impliques": number
--   },
--   "sdis_impliques": string[],        -- Liste des SDIS impliqués (codes)
--   "surface_sinistree": string,       -- Surface concernée (ex: "500 m²")
--   "nb_personnes_evacuees": number,   -- Nombre de personnes évacuées
--   "nb_lances": number,               -- Nombre de lances en action
--   "debit_eau": string                -- Débit d'eau utilisé (ex: "2000 L/min")
-- }

ALTER TABLE rex ADD COLUMN IF NOT EXISTS key_figures jsonb DEFAULT '{}'::jsonb;
COMMENT ON COLUMN rex.key_figures IS 'Chiffres clés de l''intervention: effectifs, durée, bilan, moyens engagés';

-- ============================================================================
-- PARTIE 2: Index pour optimiser les recherches
-- ============================================================================

-- Index GIN sur key_figures pour recherche dans le JSONB
CREATE INDEX IF NOT EXISTS idx_rex_key_figures ON rex USING GIN (key_figures);

-- ============================================================================
-- PARTIE 3: Fonction de validation
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_key_figures()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que key_figures est un objet valide
  IF NEW.key_figures IS NOT NULL AND jsonb_typeof(NEW.key_figures) != 'object' THEN
    RAISE EXCEPTION 'key_figures doit être un objet JSON';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger de validation
DROP TRIGGER IF EXISTS trigger_validate_key_figures ON rex;
CREATE TRIGGER trigger_validate_key_figures
  BEFORE INSERT OR UPDATE ON rex
  FOR EACH ROW
  EXECUTE FUNCTION validate_key_figures();

-- ============================================================================
-- NOTES D'IMPLÉMENTATION
-- ============================================================================

-- Champs principaux affichés dans les cards visuelles:
-- 1. Nombre de SP engagés (icône: Users)
-- 2. Durée d'intervention (icône: Clock)
-- 3. Bilan humain (icône: Heart)
-- 4. Nombre de véhicules (icône: Truck)
-- 5. SDIS impliqués (icône: Building2)

-- Champs secondaires (affichés dans le détail):
-- - Surface sinistrée
-- - Personnes évacuées
-- - Nombre de lances
-- - Débit d'eau
