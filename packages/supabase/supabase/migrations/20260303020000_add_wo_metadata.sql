-- Add metadata jsonb column to work_orders table for type-specific data
ALTER TABLE work_orders ADD COLUMN metadata jsonb;
