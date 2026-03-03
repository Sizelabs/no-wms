-- Add new fields to shipping_instructions for ship flow
ALTER TABLE shipping_instructions
  ADD COLUMN destination_city text,
  ADD COLUMN insure_cargo boolean NOT NULL DEFAULT false,
  ADD COLUMN is_dgr boolean NOT NULL DEFAULT false;
