-- ============================================================================
-- Migration: Auto-seed default modalities & charge_types on organization create
-- Also backfills any existing orgs that are missing them.
-- ============================================================================

-- 1. Trigger function to seed defaults when a new organization is inserted
CREATE OR REPLACE FUNCTION seed_org_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Default modalities
  INSERT INTO modalities (organization_id, name, code, display_order) VALUES
    (NEW.id, 'Aerea',     'aerea',     1),
    (NEW.id, 'Maritima',  'maritima',  2),
    (NEW.id, 'Courier',   'courier',   3),
    (NEW.id, 'Terrestre', 'terrestre', 4)
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Default charge types
  INSERT INTO charge_types (organization_id, name) VALUES
    (NEW.id, 'Flete Aereo Minimo'),
    (NEW.id, 'Flete Aereo x KG'),
    (NEW.id, 'FSC x KG'),
    (NEW.id, 'SCR x KG'),
    (NEW.id, 'SED'),
    (NEW.id, 'MAWB'),
    (NEW.id, 'HAWB'),
    (NEW.id, 'Delivery por KG'),
    (NEW.id, 'DGR'),
    (NEW.id, 'Ordenes de Trabajo'),
    (NEW.id, 'Bodegaje'),
    (NEW.id, 'Handling')
  ON CONFLICT (organization_id, name) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to organizations table
CREATE TRIGGER seed_org_defaults_after_insert
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_org_defaults();

-- 3. Backfill: seed defaults for any existing org that is missing them
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    INSERT INTO modalities (organization_id, name, code, display_order) VALUES
      (org_record.id, 'Aerea',     'aerea',     1),
      (org_record.id, 'Maritima',  'maritima',  2),
      (org_record.id, 'Courier',   'courier',   3),
      (org_record.id, 'Terrestre', 'terrestre', 4)
    ON CONFLICT (organization_id, code) DO NOTHING;

    INSERT INTO charge_types (organization_id, name, display_order) VALUES
      (org_record.id, 'Flete Aereo Minimo',  1),
      (org_record.id, 'Flete Aereo x KG',    2),
      (org_record.id, 'FSC x KG',            3),
      (org_record.id, 'SCR x KG',            4),
      (org_record.id, 'SED',                  5),
      (org_record.id, 'MAWB',                 6),
      (org_record.id, 'HAWB',                 7),
      (org_record.id, 'Delivery por KG',     8),
      (org_record.id, 'DGR',                  9),
      (org_record.id, 'Ordenes de Trabajo',  10),
      (org_record.id, 'Bodegaje',            11),
      (org_record.id, 'Handling',            12)
    ON CONFLICT (organization_id, name) DO NOTHING;
  END LOOP;
END $$;
