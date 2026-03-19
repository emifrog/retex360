-- ============================================
-- 011: Ressources complémentaires + numérotation automatique REX
-- ============================================

-- Ressources complémentaires (JSONB array)
-- Structure: [{id, titre, type, url_ou_reference}]
-- Types: arvi, gdo, ddr, etare, gto, gnr, autre
ALTER TABLE rex ADD COLUMN IF NOT EXISTS ressources_complementaires JSONB DEFAULT '[]'::jsonb;

-- Numéro de REX (format: RETEX-YYYY-XXX, généré à la validation)
ALTER TABLE rex ADD COLUMN IF NOT EXISTS numero_rex VARCHAR(20);

-- Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_rex_ressources ON rex USING GIN (ressources_complementaires);

-- Unique index on numero_rex (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rex_numero_unique ON rex (numero_rex) WHERE numero_rex IS NOT NULL;

-- Validation trigger: ressources_complementaires must be a JSON array
CREATE OR REPLACE FUNCTION validate_ressources()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ressources_complementaires IS NOT NULL AND jsonb_typeof(NEW.ressources_complementaires) != 'array' THEN
    RAISE EXCEPTION 'ressources_complementaires must be a JSON array';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_ressources
  BEFORE INSERT OR UPDATE ON rex
  FOR EACH ROW
  EXECUTE FUNCTION validate_ressources();

-- Auto-numbering function: generates RETEX-YYYY-XXX on validation
CREATE OR REPLACE FUNCTION generate_numero_rex()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
  sdis_code TEXT;
BEGIN
  -- Only generate when status changes to 'validated' and no numero_rex yet
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') AND NEW.numero_rex IS NULL THEN
    year_str := EXTRACT(YEAR FROM COALESCE(NEW.intervention_date, CURRENT_DATE))::TEXT;

    -- Get SDIS code
    SELECT code INTO sdis_code FROM sdis WHERE id = NEW.sdis_id;

    -- Count existing validated REX for this SDIS this year
    SELECT COUNT(*) + 1 INTO next_num
    FROM rex
    WHERE sdis_id = NEW.sdis_id
      AND numero_rex IS NOT NULL
      AND numero_rex LIKE 'RETEX-' || sdis_code || '-' || year_str || '-%';

    NEW.numero_rex := 'RETEX-' || COALESCE(sdis_code, '00') || '-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_numero_rex
  BEFORE UPDATE ON rex
  FOR EACH ROW
  EXECUTE FUNCTION generate_numero_rex();
