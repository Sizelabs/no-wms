-- Move condition_flags from warehouse_receipts to packages
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS condition_flags text[] NOT NULL DEFAULT '{sin_novedad}';

-- Backfill: copy receipt-level flags to all its packages
UPDATE packages p
SET condition_flags = wr.condition_flags
FROM warehouse_receipts wr
WHERE p.warehouse_receipt_id = wr.id
  AND wr.condition_flags <> '{}'
  AND wr.condition_flags <> '{sin_novedad}';
