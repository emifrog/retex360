-- ============================================
-- 010: Add temoignages (verbatims) and description_site fields
-- ============================================

-- Témoignages / Verbatims (JSONB array)
-- Structure: [{id, auteur_fonction, citation, contexte}]
ALTER TABLE rex ADD COLUMN IF NOT EXISTS temoignages JSONB DEFAULT '[]'::jsonb;

-- Description de l'ouvrage/site (rich text)
-- Pour tunnels, bâtiments ERP, sites industriels, etc.
ALTER TABLE rex ADD COLUMN IF NOT EXISTS description_site TEXT;

-- GIN index for JSONB queries on temoignages
CREATE INDEX IF NOT EXISTS idx_rex_temoignages ON rex USING GIN (temoignages);

-- Validation trigger: temoignages must be a JSON array
CREATE OR REPLACE FUNCTION validate_temoignages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.temoignages IS NOT NULL AND jsonb_typeof(NEW.temoignages) != 'array' THEN
    RAISE EXCEPTION 'temoignages must be a JSON array';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_temoignages
  BEFORE INSERT OR UPDATE ON rex
  FOR EACH ROW
  EXECUTE FUNCTION validate_temoignages();
