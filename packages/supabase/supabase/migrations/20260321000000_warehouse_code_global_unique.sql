-- WHR Numbering: warehouse code prefix + 6-digit sequential
-- Warehouse codes must be globally unique so WHR numbers are automatically unique.

-- Drop existing org-scoped unique constraint on warehouses.code
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS warehouses_organization_id_code_key;

-- Add global unique constraint
ALTER TABLE warehouses ADD CONSTRAINT warehouses_code_key UNIQUE (code);

-- Enforce 2-5 uppercase letter format
ALTER TABLE warehouses ADD CONSTRAINT warehouses_code_format CHECK (code ~ '^[A-Z]{2,5}$');

-- Drop wr_prefix from organizations (dead code)
ALTER TABLE organizations DROP COLUMN IF EXISTS wr_prefix;
