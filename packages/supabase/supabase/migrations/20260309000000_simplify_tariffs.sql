-- ============================================================================
-- Migration: Simplify tariff system
-- - Drops: tariff_brackets, tariff_schedules, shipping_categories,
--          get_applicable_tariff(), check_bracket_overlap()
-- - Creates: modalities, charge_types, warehouse_destination_modalities,
--            simplified tariff_schedules
-- - Seeds default charge_types and modalities for all existing orgs
-- ============================================================================

-- ============================================================================
-- 1. DROP old tariff system
-- ============================================================================

-- Drop the lookup function
DROP FUNCTION IF EXISTS get_applicable_tariff(uuid, text, uuid, uuid, text, uuid, text, uuid, text, numeric);

-- Drop tariff_brackets (depends on tariff_schedules)
DROP TRIGGER IF EXISTS trg_bracket_overlap ON tariff_brackets;
DROP TRIGGER IF EXISTS set_tariff_brackets_updated_at ON tariff_brackets;
DROP POLICY IF EXISTS tb_select ON tariff_brackets;
DROP POLICY IF EXISTS tb_insert ON tariff_brackets;
DROP POLICY IF EXISTS tb_update ON tariff_brackets;
DROP POLICY IF EXISTS tb_delete ON tariff_brackets;
DROP TABLE IF EXISTS tariff_brackets CASCADE;

-- Drop check_bracket_overlap function
DROP FUNCTION IF EXISTS check_bracket_overlap();

-- Drop tariff_schedules
DROP TRIGGER IF EXISTS set_tariff_schedules_updated_at ON tariff_schedules;
DROP TRIGGER IF EXISTS audit_tariff_schedules ON tariff_schedules;
DROP POLICY IF EXISTS ts_select ON tariff_schedules;
DROP POLICY IF EXISTS ts_insert ON tariff_schedules;
DROP POLICY IF EXISTS ts_update ON tariff_schedules;
DROP POLICY IF EXISTS ts_delete ON tariff_schedules;
DROP TABLE IF EXISTS tariff_schedules CASCADE;

-- Drop shipping_categories
DROP TRIGGER IF EXISTS set_shipping_categories_updated_at ON shipping_categories;
DROP TRIGGER IF EXISTS audit_shipping_categories ON shipping_categories;
DROP POLICY IF EXISTS sc_select ON shipping_categories;
DROP POLICY IF EXISTS sc_insert ON shipping_categories;
DROP POLICY IF EXISTS sc_update ON shipping_categories;
DROP POLICY IF EXISTS sc_delete ON shipping_categories;
DROP TABLE IF EXISTS shipping_categories CASCADE;

-- ============================================================================
-- 2. CREATE modalities table
-- ============================================================================

CREATE TABLE modalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

ALTER TABLE modalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY mod_select ON modalities FOR SELECT USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY mod_insert ON modalities FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY mod_update ON modalities FOR UPDATE USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY mod_delete ON modalities FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE TRIGGER set_modalities_updated_at
  BEFORE UPDATE ON modalities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_modalities
  AFTER INSERT OR UPDATE OR DELETE ON modalities
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================================
-- 3. CREATE charge_types table
-- ============================================================================

CREATE TABLE charge_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE charge_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY ct_select ON charge_types FOR SELECT USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY ct_insert ON charge_types FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY ct_update ON charge_types FOR UPDATE USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY ct_delete ON charge_types FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE TRIGGER set_charge_types_updated_at
  BEFORE UPDATE ON charge_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_charge_types
  AFTER INSERT OR UPDATE OR DELETE ON charge_types
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================================
-- 4. CREATE warehouse_destination_modalities junction table
-- ============================================================================

CREATE TABLE warehouse_destination_modalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_destination_id uuid NOT NULL REFERENCES warehouse_destinations(id) ON DELETE CASCADE,
  modality_id uuid NOT NULL REFERENCES modalities(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_destination_id, modality_id)
);

ALTER TABLE warehouse_destination_modalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY wdm_select ON warehouse_destination_modalities FOR SELECT USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY wdm_insert ON warehouse_destination_modalities FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY wdm_update ON warehouse_destination_modalities FOR UPDATE USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY wdm_delete ON warehouse_destination_modalities FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

-- ============================================================================
-- 5. CREATE simplified tariff_schedules table
-- ============================================================================

CREATE TABLE tariff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  charge_type_id uuid NOT NULL REFERENCES charge_types(id) ON DELETE CASCADE,
  destination_id uuid REFERENCES destinations(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES couriers(id) ON DELETE CASCADE,
  rate numeric(10,4) NOT NULL,
  rate_unit text NOT NULL CHECK (rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_shipment')),
  minimum_charge numeric(10,2),
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_requires_courier CHECK (agency_id IS NULL OR courier_id IS NOT NULL)
);

ALTER TABLE tariff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY ts_select ON tariff_schedules FOR SELECT USING (
  auth_has_role('super_admin')
  OR (
    organization_id = auth_org_id()
    AND (
      NOT (auth_has_role('destination_admin') OR auth_has_role('destination_operator'))
      OR courier_id = ANY(auth_courier_ids())
      OR courier_id IS NULL
    )
  )
);
CREATE POLICY ts_insert ON tariff_schedules FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY ts_update ON tariff_schedules FOR UPDATE USING (
  auth_has_role('super_admin')
  OR (
    organization_id = auth_org_id()
    AND (
      NOT (auth_has_role('destination_admin') OR auth_has_role('destination_operator'))
      OR courier_id = ANY(auth_courier_ids())
      OR courier_id IS NULL
    )
  )
);
CREATE POLICY ts_delete ON tariff_schedules FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE TRIGGER set_tariff_schedules_updated_at
  BEFORE UPDATE ON tariff_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_tariff_schedules
  AFTER INSERT OR UPDATE OR DELETE ON tariff_schedules
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================================
-- 6. SEED default charge_types for all existing organizations
-- ============================================================================

DO $$
DECLARE
  org_record RECORD;
  charge_names text[] := ARRAY[
    'Flete Aereo Minimo',
    'Flete Aereo x KG',
    'FSC x KG',
    'SCR x KG',
    'SED',
    'MAWB',
    'HAWB',
    'Delivery por KG',
    'DGR',
    'Ordenes de Trabajo',
    'Bodegaje',
    'Handling'
  ];
  i int;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    FOR i IN 1..array_length(charge_names, 1) LOOP
      INSERT INTO charge_types (organization_id, name, display_order)
      VALUES (org_record.id, charge_names[i], i)
      ON CONFLICT (organization_id, name) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- 7. SEED default modalities for all existing organizations
-- ============================================================================

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
  END LOOP;
END $$;

-- ============================================================================
-- 8. DROP hardcoded modality CHECK on courier_warehouse_destinations if exists
-- ============================================================================

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'courier_warehouse_destinations'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%modality%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE courier_warehouse_destinations DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;
