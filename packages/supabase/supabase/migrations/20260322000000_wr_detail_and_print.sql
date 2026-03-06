-- 1a. Condition flags on warehouse_receipts
ALTER TABLE warehouse_receipts
  ADD COLUMN IF NOT EXISTS condition_flags text[] NOT NULL DEFAULT '{}';

-- 1b. Warehouse detail fields for print header
ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS full_address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- 1c. Platform-level legal term defaults
INSERT INTO settings (scope_type, scope_id, key, value)
SELECT 'platform', NULL, k, v
FROM (VALUES
  ('wr_delivery_statement', '"Goods to be delivered to the named consignee or their authorized agent upon presentation of proper identification and payment of all applicable charges."'::jsonb),
  ('wr_lien_statement', '"No advances made. Warehouse claims a general lien per applicable terms and Florida Statute §677.209."'::jsonb),
  ('wr_liability_per_pound', '"0.50"'::jsonb),
  ('wr_ownership_statement', '"Goods are not owned by the warehouse."'::jsonb),
  ('wr_terms_url', '""'::jsonb),
  ('wr_storage_charges_text', '"Per applicable rate schedule on file."'::jsonb)
) AS t(k, v)
WHERE NOT EXISTS (
  SELECT 1 FROM settings s
  WHERE s.organization_id IS NULL
    AND s.scope_type = 'platform'
    AND s.scope_id IS NULL
    AND s.key = t.k
);
