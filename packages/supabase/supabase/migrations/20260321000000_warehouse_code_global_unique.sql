-- WHR Numbering: warehouse code prefix + 6-digit sequential
-- Warehouse codes must be unique within each organization.

-- Enforce 2-5 uppercase letter format on warehouse codes
ALTER TABLE warehouses ADD CONSTRAINT warehouses_code_format CHECK (code ~ '^[A-Z]{2,5}$');

-- Drop wr_prefix from organizations (dead code)
ALTER TABLE organizations DROP COLUMN IF EXISTS wr_prefix;
