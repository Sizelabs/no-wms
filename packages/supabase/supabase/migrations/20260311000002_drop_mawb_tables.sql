-- ============================================================================
-- Migration: Drop old MAWB tables after shipments migration verification
-- ============================================================================

-- Drop RLS policies on old tables (these were created in the initial migration)
DROP POLICY IF EXISTS "org_select" ON mawb_status_history;
DROP POLICY IF EXISTS "org_insert" ON mawb_status_history;
DROP POLICY IF EXISTS "org_update" ON mawb_status_history;

DROP POLICY IF EXISTS "org_select" ON airline_reservations;
DROP POLICY IF EXISTS "org_insert" ON airline_reservations;
DROP POLICY IF EXISTS "org_update" ON airline_reservations;

DROP POLICY IF EXISTS "org_select" ON mawbs;
DROP POLICY IF EXISTS "org_insert" ON mawbs;
DROP POLICY IF EXISTS "org_update" ON mawbs;

-- Drop triggers
DROP TRIGGER IF EXISTS set_updated_at ON mawbs;
DROP TRIGGER IF EXISTS set_updated_at ON airline_reservations;
DROP TRIGGER IF EXISTS audit_mawbs ON mawbs;

-- Drop old tables (order matters for FK deps)
DROP TABLE IF EXISTS mawb_status_history;
DROP TABLE IF EXISTS airline_reservations;

-- Drop mawb_id FK columns
ALTER TABLE hawbs DROP CONSTRAINT IF EXISTS hawbs_mawb_id_fkey;
ALTER TABLE hawbs DROP COLUMN IF EXISTS mawb_id;

ALTER TABLE cargo_releases DROP CONSTRAINT IF EXISTS cargo_releases_mawb_id_fkey;
ALTER TABLE cargo_releases DROP COLUMN IF EXISTS mawb_id;

-- Drop index on hawbs.mawb_id
DROP INDEX IF EXISTS idx_hawbs_mawb;

-- Now drop mawbs (no more FKs pointing to it)
DROP TABLE IF EXISTS mawbs;
