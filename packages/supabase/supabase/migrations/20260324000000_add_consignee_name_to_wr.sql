-- Allow warehouse receipts to store a plain-text consignee name
-- when the consignee is not an existing record in the consignees table.
alter table warehouse_receipts
  add column consignee_name text;
