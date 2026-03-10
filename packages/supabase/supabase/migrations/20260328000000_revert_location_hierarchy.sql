-- Reverse migration: undo location hierarchy changes
-- This migration undoes all objects created by the original 20260327000000 migration.

-- =========================================================================
-- 1. Drop triggers (must come before dropping functions they reference)
--    Use DO blocks for tables that may not exist (original migration may
--    have been removed before this revert runs on a fresh reset).
-- =========================================================================

DROP TRIGGER IF EXISTS update_location_counts_trigger ON packages;
DROP TRIGGER IF EXISTS check_location_warehouse ON warehouse_locations;

-- Audit triggers (some tables may not exist)
DO $$ BEGIN DROP TRIGGER IF EXISTS audit_location_templates ON location_templates; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS audit_package_movements ON package_movements; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS audit_warehouse_location_levels ON warehouse_location_levels; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DROP TRIGGER IF EXISTS audit_warehouse_locations ON warehouse_locations;
DROP TRIGGER IF EXISTS audit_warehouse_zones ON warehouse_zones;

-- set_updated_at triggers added by this migration
DO $$ BEGIN DROP TRIGGER IF EXISTS set_updated_at ON location_templates; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DROP TRIGGER IF EXISTS set_updated_at ON warehouse_locations;
DROP TRIGGER IF EXISTS set_updated_at ON warehouse_zones;

-- =========================================================================
-- 2. Drop functions created by this migration
-- =========================================================================

DROP FUNCTION IF EXISTS update_location_counts();
DROP FUNCTION IF EXISTS rebuild_location_path(uuid);
DROP FUNCTION IF EXISTS check_location_warehouse_match();

-- =========================================================================
-- 3. Drop indexes on warehouse_locations (added columns)
-- =========================================================================

DROP INDEX IF EXISTS idx_wl_parent;
DROP INDEX IF EXISTS idx_wl_warehouse;
DROP INDEX IF EXISTS idx_wl_full_path;
DROP INDEX IF EXISTS idx_wl_assignable;
DROP INDEX IF EXISTS idx_wl_agency_affinity;

-- =========================================================================
-- 4. Drop indexes on package_movements
-- =========================================================================

DROP INDEX IF EXISTS idx_pkg_movements_pkg;
DROP INDEX IF EXISTS idx_pkg_movements_warehouse;
DROP INDEX IF EXISTS idx_pkg_movements_type;
DROP INDEX IF EXISTS idx_pkg_movements_from_location;
DROP INDEX IF EXISTS idx_pkg_movements_to_location;

-- =========================================================================
-- 5. Drop new tables (order matters for FK references)
-- =========================================================================

DROP TABLE IF EXISTS location_templates;
DROP TABLE IF EXISTS package_movements;

-- =========================================================================
-- 6. Remove added columns from warehouse_locations
--    (must come before dropping warehouse_location_levels due to FK)
-- =========================================================================

ALTER TABLE warehouse_locations
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS warehouse_id,
  DROP COLUMN IF EXISTS level_id,
  DROP COLUMN IF EXISTS full_path,
  DROP COLUMN IF EXISTS depth,
  DROP COLUMN IF EXISTS is_assignable,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS capacity_packages,
  DROP COLUMN IF EXISTS current_count,
  DROP COLUMN IF EXISTS max_weight_lb,
  DROP COLUMN IF EXISTS max_length_in,
  DROP COLUMN IF EXISTS max_width_in,
  DROP COLUMN IF EXISTS max_height_in,
  DROP COLUMN IF EXISTS preferred_agency_id,
  DROP COLUMN IF EXISTS updated_at;

-- =========================================================================
-- 7. Drop warehouse_location_levels (after FK columns removed)
-- =========================================================================

DROP TABLE IF EXISTS warehouse_location_levels;

-- =========================================================================
-- 8. Remove added columns from warehouse_zones
-- =========================================================================

ALTER TABLE warehouse_zones
  DROP COLUMN IF EXISTS zone_type,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS updated_at;

-- =========================================================================
-- 9. Drop enum types
-- =========================================================================

DROP TYPE IF EXISTS movement_type;
DROP TYPE IF EXISTS zone_type;
