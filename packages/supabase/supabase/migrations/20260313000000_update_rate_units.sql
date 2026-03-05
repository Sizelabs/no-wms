-- ============================================================================
-- Migration: Replace per_shipment with per_mawb and per_hawb rate units
-- ============================================================================

-- 1. Update existing data: per_shipment → per_mawb
UPDATE tariff_schedules SET rate_unit = 'per_mawb' WHERE rate_unit = 'per_shipment';
UPDATE courier_tariffs SET rate_unit = 'per_mawb' WHERE rate_unit = 'per_shipment';
UPDATE handling_costs SET base_rate_unit = 'per_mawb' WHERE base_rate_unit = 'per_shipment';

-- 2. Drop old CHECK constraints and recreate with new values

-- tariff_schedules
ALTER TABLE tariff_schedules DROP CONSTRAINT IF EXISTS tariff_schedules_rate_unit_check;
ALTER TABLE tariff_schedules ADD CONSTRAINT tariff_schedules_rate_unit_check
  CHECK (rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_mawb','per_hawb'));

-- courier_tariffs
ALTER TABLE courier_tariffs DROP CONSTRAINT IF EXISTS courier_tariffs_rate_unit_check;
ALTER TABLE courier_tariffs ADD CONSTRAINT courier_tariffs_rate_unit_check
  CHECK (rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_mawb','per_hawb'));

-- handling_costs base_rate_unit
ALTER TABLE handling_costs DROP CONSTRAINT IF EXISTS handling_costs_base_rate_unit_check;
ALTER TABLE handling_costs ADD CONSTRAINT handling_costs_base_rate_unit_check
  CHECK (base_rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_mawb','per_hawb'));
