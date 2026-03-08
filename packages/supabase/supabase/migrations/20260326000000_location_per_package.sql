-- Move warehouse_location_id from warehouse_receipts to packages
-- Each package can now have its own location within the warehouse

-- 1. Add column to packages
ALTER TABLE packages
  ADD COLUMN warehouse_location_id uuid REFERENCES warehouse_locations(id);

-- 2. Copy existing WR-level location to all its packages
UPDATE packages p
  SET warehouse_location_id = wr.warehouse_location_id
  FROM warehouse_receipts wr
  WHERE p.warehouse_receipt_id = wr.id
    AND wr.warehouse_location_id IS NOT NULL;

-- 3. Drop the column from warehouse_receipts
ALTER TABLE warehouse_receipts
  DROP COLUMN warehouse_location_id;
