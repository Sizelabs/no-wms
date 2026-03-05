-- ============================================================================
-- Migration: Rename charge_types → handling_costs
-- ============================================================================

-- 1. Rename the table
ALTER TABLE charge_types RENAME TO handling_costs;

-- 2. Rename the FK column in tariff_schedules
ALTER TABLE tariff_schedules RENAME COLUMN charge_type_id TO handling_cost_id;

-- 3. Update RLS policy names (drop + recreate with new names)
DROP POLICY IF EXISTS ct_select ON handling_costs;
DROP POLICY IF EXISTS ct_insert ON handling_costs;
DROP POLICY IF EXISTS ct_update ON handling_costs;
DROP POLICY IF EXISTS ct_delete ON handling_costs;

CREATE POLICY hc_select ON handling_costs FOR SELECT USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY hc_insert ON handling_costs FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY hc_update ON handling_costs FOR UPDATE USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY hc_delete ON handling_costs FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

-- 4. Rename triggers
ALTER TRIGGER set_charge_types_updated_at ON handling_costs RENAME TO set_handling_costs_updated_at;
ALTER TRIGGER audit_charge_types ON handling_costs RENAME TO audit_handling_costs;

-- 5. Update seed_org_defaults() trigger function
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update role_permissions seed data
UPDATE role_permissions SET resource = 'handling_costs' WHERE resource = 'charge_types';
