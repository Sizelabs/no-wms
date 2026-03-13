-- =============================================================================
-- Migration: Modality as a Route-Level Dimension
-- =============================================================================
-- Makes modality a route attribute: courier → destination → modality
-- Shipping categories now belong to a destination+modality combination
-- SIs get a proper modality_id FK instead of deprecated text codes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1A. courier_destinations + modality_id
-- ---------------------------------------------------------------------------

-- Add nullable column first
ALTER TABLE courier_destinations
  ADD COLUMN modality_id uuid REFERENCES modalities(id) ON DELETE CASCADE;

-- Drop old unique constraint BEFORE expanding rows
ALTER TABLE courier_destinations
  DROP CONSTRAINT IF EXISTS courier_destinations_courier_id_destination_id_key;

-- Data migration: expand each existing row into N rows (one per org modality)
INSERT INTO courier_destinations (organization_id, courier_id, destination_id, modality_id, is_active)
SELECT
  cd.organization_id,
  cd.courier_id,
  cd.destination_id,
  m.id,
  cd.is_active
FROM courier_destinations cd
JOIN modalities m ON m.organization_id = cd.organization_id
WHERE cd.modality_id IS NULL;

-- Delete original NULL-modality rows
DELETE FROM courier_destinations WHERE modality_id IS NULL;

-- Now make NOT NULL
ALTER TABLE courier_destinations
  ALTER COLUMN modality_id SET NOT NULL;

-- Add new unique constraint
ALTER TABLE courier_destinations
  ADD CONSTRAINT courier_destinations_courier_destination_modality_key
    UNIQUE (courier_id, destination_id, modality_id);

-- ---------------------------------------------------------------------------
-- 1B. shipping_categories + modality_id
-- ---------------------------------------------------------------------------

ALTER TABLE shipping_categories
  ADD COLUMN modality_id uuid REFERENCES modalities(id) ON DELETE SET NULL;

-- Data migration: assign all existing categories to the 'courier' modality
UPDATE shipping_categories sc
SET modality_id = m.id
FROM modalities m
WHERE m.organization_id = sc.organization_id
  AND m.code = 'courier'
  AND sc.modality_id IS NULL;

-- Fallback: assign remaining NULL rows to any modality in their org
UPDATE shipping_categories sc
SET modality_id = (
  SELECT id FROM modalities m
  WHERE m.organization_id = sc.organization_id
  ORDER BY display_order LIMIT 1
)
WHERE sc.modality_id IS NULL;

-- Delete any remaining orphans (orgs with no modalities at all)
DELETE FROM shipping_categories WHERE modality_id IS NULL;

-- Make NOT NULL
ALTER TABLE shipping_categories
  ALTER COLUMN modality_id SET NOT NULL;

-- Replace unique constraint
ALTER TABLE shipping_categories
  DROP CONSTRAINT IF EXISTS shipping_categories_organization_id_country_code_code_key;
ALTER TABLE shipping_categories
  DROP CONSTRAINT IF EXISTS shipping_categories_org_id_country_code_code_key;
ALTER TABLE shipping_categories
  ADD CONSTRAINT shipping_categories_org_country_modality_code_key
    UNIQUE (organization_id, country_code, modality_id, code);

-- ---------------------------------------------------------------------------
-- 1C. shipping_instructions + modality_id
-- ---------------------------------------------------------------------------

ALTER TABLE shipping_instructions
  ADD COLUMN modality_id uuid REFERENCES modalities(id) ON DELETE SET NULL;

-- Data migration: map legacy text codes to modality UUIDs
-- courier_% → courier, air_cargo → aerea, lcl/fcl → maritima, terrestre → terrestre
UPDATE shipping_instructions si
SET modality_id = m.id
FROM profiles p
JOIN modalities m ON m.organization_id = p.organization_id
WHERE si.modality_id IS NULL
  AND p.organization_id = si.organization_id
  AND (
    (si.modality LIKE 'courier_%' AND m.code = 'courier')
    OR (si.modality = 'air_cargo' AND m.code = 'aerea')
    OR (si.modality IN ('lcl', 'fcl') AND m.code = 'maritima')
    OR (si.modality = 'terrestre' AND m.code = 'terrestre')
  );

-- ---------------------------------------------------------------------------
-- 1D. Update seed_org_defaults() trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION seed_org_defaults()
RETURNS TRIGGER AS $$
DECLARE
  cat_bplus_id uuid;
  cat_c_id uuid;
  cat_d_id uuid;
  courier_modality_id uuid;
BEGIN
  -- Default modalities
  INSERT INTO modalities (organization_id, name, code, display_order) VALUES
    (NEW.id, 'Aerea',     'aerea',     1),
    (NEW.id, 'Maritima',  'maritima',  2),
    (NEW.id, 'Courier',   'courier',   3),
    (NEW.id, 'Terrestre', 'terrestre', 4)
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Get courier modality id for seeding shipping categories
  SELECT id INTO courier_modality_id FROM modalities
    WHERE organization_id = NEW.id AND code = 'courier';

  -- Default handling costs
  INSERT INTO handling_costs (organization_id, name) VALUES
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

  -- Default Ecuador shipping categories (with modality_id)
  INSERT INTO shipping_categories (organization_id, country_code, modality_id, code, name, description, display_order, max_weight_kg, min_declared_value_usd, max_declared_value_usd, cargo_type, allows_dgr, requires_cedula, requires_ruc, customs_declaration_type, country_specific_rules)
  VALUES
    (NEW.id, 'EC', courier_modality_id, 'A', 'Documentos / Correspondencia', 'Solo documentos y correspondencia sin valor comercial', 1, NULL, NULL, NULL, 'documents_only', false, false, false, 'none', '{}'),
    (NEW.id, 'EC', courier_modality_id, 'B', 'Paquetes hasta 4kg/$400 (4x4)', 'Regimen simplificado — consume cupo 4x4', 2, 4, NULL, 400, 'general', false, true, false, 'simplified', '{"consumes_cupo_4x4": true}'),
    (NEW.id, 'EC', courier_modality_id, 'B+', 'Paquetes 4-50kg o $400-$2000', 'Regimen simplificado extendido — requiere documentos comerciales', 3, 50, 400.01, 2000, 'general', false, true, false, 'simplified', '{}'),
    (NEW.id, 'EC', courier_modality_id, 'C', 'Mercancia formal (DAI)', 'Declaracion aduanera de importacion — requiere RUC y agente de aduanas', 4, NULL, 2000.01, NULL, 'general', false, false, true, 'formal', '{}'),
    (NEW.id, 'EC', courier_modality_id, 'D', 'Mercancia peligrosa/restringida', 'Requiere permisos especiales INEN y manejo DGR', 5, NULL, NULL, NULL, 'dangerous_goods', true, false, true, 'formal', '{}')
  ON CONFLICT (organization_id, country_code, modality_id, code) DO NOTHING;

  -- Required documents for B+
  SELECT id INTO cat_bplus_id FROM shipping_categories WHERE organization_id = NEW.id AND country_code = 'EC' AND code = 'B+';
  IF cat_bplus_id IS NOT NULL THEN
    INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
      (cat_bplus_id, 'commercial_invoice', 'Factura Comercial', true),
      (cat_bplus_id, 'packing_list', 'Lista de Empaque', true);
  END IF;

  -- Required documents for C
  SELECT id INTO cat_c_id FROM shipping_categories WHERE organization_id = NEW.id AND country_code = 'EC' AND code = 'C';
  IF cat_c_id IS NOT NULL THEN
    INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
      (cat_c_id, 'commercial_invoice', 'Factura Comercial', true),
      (cat_c_id, 'packing_list', 'Lista de Empaque', true),
      (cat_c_id, 'power_of_attorney', 'Poder de Autorizacion', true);
  END IF;

  -- Required documents for D
  SELECT id INTO cat_d_id FROM shipping_categories WHERE organization_id = NEW.id AND country_code = 'EC' AND code = 'D';
  IF cat_d_id IS NOT NULL THEN
    INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
      (cat_d_id, 'commercial_invoice', 'Factura Comercial', true),
      (cat_d_id, 'packing_list', 'Lista de Empaque', true),
      (cat_d_id, 'inen_certificate', 'Certificado INEN', true),
      (cat_d_id, 'special_permit', 'Permiso Especial', true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
