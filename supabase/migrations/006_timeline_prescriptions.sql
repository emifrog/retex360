-- Migration: Timeline chronologique et Prescriptions catégorisées
-- Ajoute la chronologie de l'intervention et les prescriptions structurées

-- ============================================================================
-- PARTIE 1: Champ chronologie (JSONB)
-- ============================================================================

-- Structure attendue pour chronologie:
-- [
--   {
--     "id": string,
--     "heure": string,           -- Format "HH:MM" ou datetime
--     "titre": string,           -- Titre court de l'événement
--     "description": string,     -- Description détaillée (optionnel)
--     "type": string             -- alerte, arrivee, action, message_radio, fin, autre
--   }
-- ]

ALTER TABLE rex ADD COLUMN IF NOT EXISTS chronologie jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN rex.chronologie IS 'Timeline chronologique de l''intervention: événements horodatés';

-- ============================================================================
-- PARTIE 2: Champ prescriptions (JSONB)
-- ============================================================================

-- Structure attendue pour prescriptions:
-- [
--   {
--     "id": string,
--     "categorie": string,       -- operations, prevention, formation, technique, autre
--     "description": string,     -- Description de la prescription
--     "responsable": string,     -- Responsable de la mise en œuvre (optionnel)
--     "echeance": string,        -- Date d'échéance (optionnel)
--     "statut": string           -- a_faire, en_cours, fait (optionnel)
--   }
-- ]

ALTER TABLE rex ADD COLUMN IF NOT EXISTS prescriptions jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN rex.prescriptions IS 'Prescriptions catégorisées issues du RETEX: plan d''actions';

-- ============================================================================
-- PARTIE 3: Index pour optimiser les recherches
-- ============================================================================

-- Index GIN sur chronologie pour recherche dans le JSONB
CREATE INDEX IF NOT EXISTS idx_rex_chronologie ON rex USING GIN (chronologie);

-- Index GIN sur prescriptions pour recherche dans le JSONB
CREATE INDEX IF NOT EXISTS idx_rex_prescriptions ON rex USING GIN (prescriptions);

-- ============================================================================
-- PARTIE 4: Fonctions de validation
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_chronologie()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que chronologie est un tableau valide
  IF NEW.chronologie IS NOT NULL AND jsonb_typeof(NEW.chronologie) != 'array' THEN
    RAISE EXCEPTION 'chronologie doit être un tableau JSON';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_prescriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que prescriptions est un tableau valide
  IF NEW.prescriptions IS NOT NULL AND jsonb_typeof(NEW.prescriptions) != 'array' THEN
    RAISE EXCEPTION 'prescriptions doit être un tableau JSON';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de validation
DROP TRIGGER IF EXISTS trigger_validate_chronologie ON rex;
CREATE TRIGGER trigger_validate_chronologie
  BEFORE INSERT OR UPDATE ON rex
  FOR EACH ROW
  EXECUTE FUNCTION validate_chronologie();

DROP TRIGGER IF EXISTS trigger_validate_prescriptions ON rex;
CREATE TRIGGER trigger_validate_prescriptions
  BEFORE INSERT OR UPDATE ON rex
  FOR EACH ROW
  EXECUTE FUNCTION validate_prescriptions();

-- ============================================================================
-- NOTES D'IMPLÉMENTATION
-- ============================================================================

-- Types d'événements chronologie:
-- - alerte: Réception de l'alerte
-- - arrivee: Arrivée sur les lieux
-- - action: Action opérationnelle
-- - message_radio: Message radio important
-- - fin: Fin d'intervention
-- - autre: Autre événement

-- Catégories de prescriptions:
-- - operations: Opérations (tactique, commandement)
-- - prevention: Prévention-Prévision
-- - formation: Formation
-- - technique: Technique (matériel, équipements)
-- - autre: Autre

-- Statuts de prescriptions:
-- - a_faire: À faire
-- - en_cours: En cours
-- - fait: Fait
