-- ============================================================================
-- Migration: Add base pricing to handling_costs + courier_tariffs table
-- - Adds base_rate, base_rate_unit, base_minimum_charge to handling_costs
-- - Creates courier_tariffs for per-courier pricing overrides
-- - Auto-seeds courier_tariffs when a new courier is created
-- ============================================================================

-- ============================================================================
-- 1. Add base pricing columns to handling_costs
-- ============================================================================

ALTER TABLE handling_costs
  ADD COLUMN base_rate numeric(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN base_rate_unit text NOT NULL DEFAULT 'flat'
    CHECK (base_rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_shipment')),
  ADD COLUMN base_minimum_charge numeric(10,2);

-- ============================================================================
-- 2. Create courier_tariffs table
-- ============================================================================

CREATE TABLE courier_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  handling_cost_id uuid NOT NULL REFERENCES handling_costs(id) ON DELETE CASCADE,
  rate numeric(10,4) NOT NULL,
  rate_unit text NOT NULL CHECK (rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_shipment')),
  minimum_charge numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(courier_id, handling_cost_id)
);

ALTER TABLE courier_tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ct_select ON courier_tariffs FOR SELECT USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY ct_insert ON courier_tariffs FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY ct_update ON courier_tariffs FOR UPDATE USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY ct_delete ON courier_tariffs FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE TRIGGER set_courier_tariffs_updated_at
  BEFORE UPDATE ON courier_tariffs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_courier_tariffs
  AFTER INSERT OR UPDATE OR DELETE ON courier_tariffs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================================
-- 3. Trigger: seed courier_tariffs on new courier creation
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_courier_tariffs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO courier_tariffs (organization_id, courier_id, handling_cost_id, rate, rate_unit, minimum_charge)
  SELECT NEW.organization_id, NEW.id, hc.id, hc.base_rate, hc.base_rate_unit, hc.base_minimum_charge
  FROM handling_costs hc
  WHERE hc.organization_id = NEW.organization_id AND hc.is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_seed_courier_tariffs
  AFTER INSERT ON couriers
  FOR EACH ROW EXECUTE FUNCTION seed_courier_tariffs();

-- ============================================================================
-- 4. Seed courier_tariffs for existing couriers (base rates = 0)
-- ============================================================================

INSERT INTO courier_tariffs (organization_id, courier_id, handling_cost_id, rate, rate_unit, minimum_charge)
SELECT c.organization_id, c.id, hc.id, hc.base_rate, hc.base_rate_unit, hc.base_minimum_charge
FROM couriers c
JOIN handling_costs hc ON hc.organization_id = c.organization_id AND hc.is_active = true
ON CONFLICT (courier_id, handling_cost_id) DO NOTHING;

-- ============================================================================
-- 5. Seed default role_permissions for courier_tariffs
-- ============================================================================

INSERT INTO role_permissions (role, resource, action)
SELECT role, 'courier_tariffs', action
FROM role_permissions
WHERE resource = 'handling_costs'
ON CONFLICT (role, resource, action) DO NOTHING;
