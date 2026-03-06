-- ============================================================================
-- Migration: Simplify courier coverage
-- Replaces courier_warehouses + courier_warehouse_destinations with a flat
-- courier_destinations table (courier_id, destination_id, is_active).
-- ============================================================================

-- 1. Drop old triggers/functions on courier_warehouse_destinations
DROP TRIGGER IF EXISTS check_cwd_destination ON courier_warehouse_destinations;
DROP FUNCTION IF EXISTS check_cwd_destination_enabled();
DROP TRIGGER IF EXISTS set_cwd_updated_at ON courier_warehouse_destinations;

-- 2. Create new courier_destinations table
CREATE TABLE courier_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(courier_id, destination_id)
);

ALTER TABLE courier_destinations ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies (same pattern as courier_warehouses)
CREATE POLICY cd_select ON courier_destinations FOR SELECT USING (
  auth_has_role('super_admin')
  OR (
    organization_id = auth_org_id()
    AND (
      NOT (auth_has_role('destination_admin') OR auth_has_role('destination_operator'))
      OR courier_id = ANY(auth_courier_ids())
    )
  )
);

CREATE POLICY cd_insert ON courier_destinations FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE POLICY cd_update ON courier_destinations FOR UPDATE USING (
  auth_has_role('super_admin')
  OR (
    organization_id = auth_org_id()
    AND (
      NOT (auth_has_role('destination_admin') OR auth_has_role('destination_operator'))
      OR courier_id = ANY(auth_courier_ids())
    )
  )
);

CREATE POLICY cd_delete ON courier_destinations FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

-- 4. Migrate existing data (flatten CWD -> CD, deduplicate)
INSERT INTO courier_destinations (organization_id, courier_id, destination_id, is_active)
SELECT DISTINCT ON (cw.courier_id, cwd.destination_id)
  cwd.organization_id, cw.courier_id, cwd.destination_id, cwd.is_active
FROM courier_warehouse_destinations cwd
JOIN courier_warehouses cw ON cw.id = cwd.courier_warehouse_id
ORDER BY cw.courier_id, cwd.destination_id, cwd.created_at;

-- 5. Drop old tables (policies first, then tables)
DROP POLICY IF EXISTS cwd_select ON courier_warehouse_destinations;
DROP POLICY IF EXISTS cwd_insert ON courier_warehouse_destinations;
DROP POLICY IF EXISTS cwd_update ON courier_warehouse_destinations;
DROP POLICY IF EXISTS cwd_delete ON courier_warehouse_destinations;
DROP TABLE courier_warehouse_destinations;

DROP POLICY IF EXISTS cw_select ON courier_warehouses;
DROP POLICY IF EXISTS cw_insert ON courier_warehouses;
DROP POLICY IF EXISTS cw_update ON courier_warehouses;
DROP POLICY IF EXISTS cw_delete ON courier_warehouses;
DROP TABLE courier_warehouses;

-- 6. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
