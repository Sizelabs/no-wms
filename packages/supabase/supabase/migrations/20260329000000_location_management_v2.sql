-- =========================================================================
-- Location Management V2: flat-locations-with-typed-zones
-- =========================================================================
-- This replaces the reverted hierarchy approach (20260327/20260328).
-- Key differences: CHECK constraints (not enums), no parent-child tree,
-- zone_type drives behavior, structured codes in location.code only.
-- =========================================================================

-- =========================================================================
-- 1a. Extend warehouse_zones
-- =========================================================================

ALTER TABLE warehouse_zones
  ADD COLUMN zone_type text NOT NULL DEFAULT 'storage'
    CHECK (zone_type IN ('receiving','putaway','storage','work_order','staging','quarantine','damaged')),
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill known seed zones by code
UPDATE warehouse_zones SET zone_type = 'receiving' WHERE code = 'REC';
UPDATE warehouse_zones SET zone_type = 'storage'   WHERE code = 'ALM';
UPDATE warehouse_zones SET zone_type = 'staging'   WHERE code = 'DES';
UPDATE warehouse_zones SET zone_type = 'storage'   WHERE code = 'GEN';

-- Triggers for warehouse_zones
CREATE TRIGGER set_updated_at BEFORE UPDATE ON warehouse_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_warehouse_zones AFTER INSERT OR UPDATE OR DELETE ON warehouse_zones
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- =========================================================================
-- 1b. Extend warehouse_locations
-- =========================================================================

ALTER TABLE warehouse_locations
  ADD COLUMN warehouse_id uuid,
  ADD COLUMN barcode text,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN blocked_reason text,
  ADD COLUMN blocked_at timestamptz,
  ADD COLUMN max_packages integer,
  ADD COLUMN current_count integer NOT NULL DEFAULT 0,
  ADD COLUMN max_weight_lb numeric(10,2),
  ADD COLUMN max_length_in numeric(10,2),
  ADD COLUMN max_width_in numeric(10,2),
  ADD COLUMN max_height_in numeric(10,2),
  ADD COLUMN preferred_agency_id uuid REFERENCES agencies(id),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill warehouse_id from zones
UPDATE warehouse_locations wl
  SET warehouse_id = wz.warehouse_id
  FROM warehouse_zones wz
  WHERE wl.zone_id = wz.id;

-- Now make NOT NULL and add FK
ALTER TABLE warehouse_locations
  ALTER COLUMN warehouse_id SET NOT NULL;
ALTER TABLE warehouse_locations
  ADD CONSTRAINT fk_wl_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;

-- Backfill barcode: {warehouse.code}-{zone.code}-{location.code}
UPDATE warehouse_locations wl
  SET barcode = w.code || '-' || wz.code || '-' || wl.code
  FROM warehouse_zones wz
  JOIN warehouses w ON w.id = wz.warehouse_id
  WHERE wl.zone_id = wz.id;

-- Make barcode NOT NULL and UNIQUE
ALTER TABLE warehouse_locations
  ALTER COLUMN barcode SET NOT NULL;
ALTER TABLE warehouse_locations
  ADD CONSTRAINT uq_wl_barcode UNIQUE (barcode);

-- Backfill current_count from actual package counts
UPDATE warehouse_locations wl
  SET current_count = sub.cnt
  FROM (
    SELECT warehouse_location_id, count(*)::int AS cnt
    FROM packages
    WHERE warehouse_location_id IS NOT NULL
    GROUP BY warehouse_location_id
  ) sub
  WHERE wl.id = sub.warehouse_location_id;

-- Triggers for warehouse_locations
CREATE TRIGGER set_updated_at BEFORE UPDATE ON warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_warehouse_locations AFTER INSERT OR UPDATE OR DELETE ON warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- =========================================================================
-- 1c. Default zones + virtual DISPATCH locations per warehouse
-- =========================================================================

-- For every warehouse, ensure all 7 default zone types exist,
-- plus a virtual DISPATCH location in the staging zone.
DO $$
DECLARE
  wh record;
  zone_def record;
  zone_id_var uuid;
BEGIN
  FOR wh IN SELECT id, organization_id, code FROM warehouses LOOP
    -- Create missing default zones
    FOR zone_def IN
      SELECT * FROM (VALUES
        ('Recepción',        'REC', 'receiving',   1),
        ('Putaway',          'PUT', 'putaway',     2),
        ('Almacenaje',       'ALM', 'storage',     3),
        ('Orden de Trabajo', 'WO',  'work_order',  4),
        ('Despacho',         'DES', 'staging',     5),
        ('Cuarentena',       'QUA', 'quarantine',  6),
        ('Dañados',          'DMG', 'damaged',     7)
      ) AS t(name, code, zone_type, sort_order)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM warehouse_zones
        WHERE warehouse_id = wh.id AND zone_type = zone_def.zone_type
      ) THEN
        INSERT INTO warehouse_zones (organization_id, warehouse_id, name, code, zone_type, sort_order)
        VALUES (wh.organization_id, wh.id, zone_def.name, zone_def.code, zone_def.zone_type, zone_def.sort_order);
      END IF;
    END LOOP;

    -- Get the staging zone for DISPATCH location
    SELECT wz.id INTO zone_id_var
    FROM warehouse_zones wz
    WHERE wz.warehouse_id = wh.id AND wz.zone_type = 'staging'
    LIMIT 1;

    -- Create DISPATCH virtual location if it doesn't exist
    IF zone_id_var IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM warehouse_locations
      WHERE warehouse_id = wh.id AND code = 'DISPATCH'
    ) THEN
      INSERT INTO warehouse_locations (organization_id, zone_id, warehouse_id, name, code, barcode, sort_order)
      VALUES (
        wh.organization_id,
        zone_id_var,
        wh.id,
        'Despacho Virtual',
        'DISPATCH',
        wh.code || '-DES-DISPATCH',
        9999
      );
    END IF;
  END LOOP;
END;
$$;

-- =========================================================================
-- 1d. Create package_movements (append-only audit table)
-- =========================================================================

CREATE TABLE package_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  from_location_id uuid REFERENCES warehouse_locations(id),
  to_location_id uuid NOT NULL REFERENCES warehouse_locations(id),
  movement_type text NOT NULL
    CHECK (movement_type IN ('receive','putaway','pick','relocate','stage','dispatch','quarantine','damage','return_to_storage')),
  moved_by uuid REFERENCES profiles(id),
  suggested_location_id uuid REFERENCES warehouse_locations(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: SELECT + INSERT only (append-only)
ALTER TABLE package_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON package_movements
  FOR SELECT USING (organization_id = auth_org_id());
CREATE POLICY "org_insert" ON package_movements
  FOR INSERT WITH CHECK (organization_id = auth_org_id());

-- Audit trigger (read-only table, but we log inserts)
CREATE TRIGGER audit_package_movements AFTER INSERT ON package_movements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- =========================================================================
-- 1e. Trigger: maintain current_count on warehouse_locations
-- =========================================================================

CREATE OR REPLACE FUNCTION update_location_current_count()
RETURNS trigger AS $$
BEGIN
  -- Handle decrement for old location
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.warehouse_location_id IS NOT NULL
       AND (TG_OP = 'DELETE' OR OLD.warehouse_location_id IS DISTINCT FROM NEW.warehouse_location_id) THEN
      UPDATE warehouse_locations
        SET current_count = GREATEST(COALESCE(current_count, 0) - 1, 0)
        WHERE id = OLD.warehouse_location_id;
    END IF;
  END IF;

  -- Handle increment for new location
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.warehouse_location_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR OLD.warehouse_location_id IS DISTINCT FROM NEW.warehouse_location_id) THEN
      UPDATE warehouse_locations
        SET current_count = COALESCE(current_count, 0) + 1
        WHERE id = NEW.warehouse_location_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_location_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_location_current_count();

-- =========================================================================
-- 1f. Indexes
-- =========================================================================

CREATE INDEX idx_wl_warehouse ON warehouse_locations(warehouse_id);
CREATE INDEX idx_wl_available ON warehouse_locations(warehouse_id) WHERE is_active AND NOT is_blocked;
CREATE INDEX idx_wz_type ON warehouse_zones(warehouse_id, zone_type);

CREATE INDEX idx_pkg_movements_pkg ON package_movements(package_id);
CREATE INDEX idx_pkg_movements_warehouse ON package_movements(warehouse_id);
CREATE INDEX idx_pkg_movements_type ON package_movements(movement_type);
CREATE INDEX idx_pkg_movements_created ON package_movements(created_at);
