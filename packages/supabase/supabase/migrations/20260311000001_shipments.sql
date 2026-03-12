-- ============================================================================
-- Migration: Replace MAWB with multi-modal Shipments
-- Creates carriers, awb_batches, shipments, shipment_containers,
-- shipment_documents tables. Generalizes hawbs with document_type.
-- Migrates existing MAWB data to shipments.
-- ============================================================================

-- ============================================================================
-- 1A. CARRIERS TABLE
-- ============================================================================

CREATE TABLE carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  modality text NOT NULL CHECK (modality IN ('air', 'ocean', 'ground')),
  contact_name text,
  contact_phone text,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code, modality)
);

ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY carriers_select ON carriers FOR SELECT USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY carriers_insert ON carriers FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY carriers_update ON carriers FOR UPDATE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY carriers_delete ON carriers FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE TRIGGER set_carriers_updated_at
  BEFORE UPDATE ON carriers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_carriers
  AFTER INSERT OR UPDATE OR DELETE ON carriers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================================
-- 1B. AWB_BATCHES TABLE (replaces airline_reservations)
-- ============================================================================

CREATE TABLE awb_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  range_start bigint NOT NULL,
  range_end bigint NOT NULL,
  next_available bigint NOT NULL,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, prefix, range_start),
  CHECK (range_start < range_end),
  CHECK (next_available >= range_start AND next_available <= range_end + 1)
);

ALTER TABLE awb_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY awb_batches_select ON awb_batches FOR SELECT USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY awb_batches_insert ON awb_batches FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY awb_batches_update ON awb_batches FOR UPDATE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY awb_batches_delete ON awb_batches FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE TRIGGER set_awb_batches_updated_at
  BEFORE UPDATE ON awb_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_awb_batches
  AFTER INSERT OR UPDATE OR DELETE ON awb_batches
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE INDEX idx_awb_batches_carrier ON awb_batches(carrier_id);

-- next_awb_number: atomically assigns next AWB with IATA mod-7 check digit
CREATE OR REPLACE FUNCTION next_awb_number(p_batch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next bigint;
  v_range_end bigint;
  v_check_digit int;
  v_serial_str text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('awb_batch_' || p_batch_id::text));

  SELECT prefix, next_available, range_end
  INTO v_prefix, v_next, v_range_end
  FROM awb_batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AWB batch not found';
  END IF;

  IF v_next > v_range_end THEN
    RAISE EXCEPTION 'AWB batch exhausted';
  END IF;

  -- IATA modulus-7 check digit
  v_check_digit := v_next % 7;
  v_serial_str := lpad(v_next::text, 7, '0') || v_check_digit::text;

  -- Increment next_available
  UPDATE awb_batches SET next_available = v_next + 1 WHERE id = p_batch_id;

  RETURN v_prefix || '-' || v_serial_str;
END;
$$;

-- ============================================================================
-- 1C. GENERALIZE hawbs TABLE — add document_type + shipment_id
-- ============================================================================

ALTER TABLE hawbs ADD COLUMN document_type text NOT NULL DEFAULT 'hawb'
  CHECK (document_type IN ('hawb', 'hbl', 'hwb'));

ALTER TABLE hawbs ADD COLUMN shipment_id uuid;

-- Update next_hawb_number to support type-aware prefix
CREATE OR REPLACE FUNCTION next_house_bill_number(p_org_id uuid, p_doc_type text DEFAULT 'hawb')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  next_num int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('house_bill_' || p_doc_type || '_' || p_org_id::text));

  CASE p_doc_type
    WHEN 'hawb' THEN v_prefix := 'GLP';
    WHEN 'hbl'  THEN v_prefix := 'HBL';
    WHEN 'hwb'  THEN v_prefix := 'HWB';
    ELSE v_prefix := 'GLP';
  END CASE;

  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(hawb_number, '[^0-9]', '', 'g'), '')::int),
    0
  ) + 1 INTO next_num
  FROM hawbs
  WHERE organization_id = p_org_id AND document_type = p_doc_type;

  RETURN v_prefix || lpad(next_num::text, 5, '0');
END;
$$;

-- Keep backward-compatible next_hawb_number that delegates to new function
CREATE OR REPLACE FUNCTION next_hawb_number(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN next_house_bill_number(p_org_id, 'hawb');
END;
$$;

-- ============================================================================
-- 1D. SHIPMENTS TABLE
-- ============================================================================

CREATE TABLE shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  modality text NOT NULL CHECK (modality IN ('air', 'ocean', 'ground')),
  shipment_number text NOT NULL,
  carrier_id uuid REFERENCES carriers(id),
  destination_id uuid REFERENCES destinations(id),
  destination_agent_id uuid REFERENCES agencies(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'booking_confirmed', 'cargo_received', 'departed',
    'in_transit', 'vessel_loaded', 'transhipment', 'at_port',
    'arrived', 'customs_clearance', 'out_for_delivery', 'delivered', 'cancelled'
  )),

  -- Shipper / Consignee
  shipper_name text,
  shipper_address text,
  consignee_name text,
  consignee_address text,

  -- Totals
  total_pieces integer,
  total_weight_lb numeric(10,2),
  total_house_bills integer,

  notes text,

  -- Air-specific (nullable)
  awb_number text,
  booking_number text,
  flight_number text,
  departure_airport text,
  arrival_airport text,
  departure_date date,
  arrival_date date,

  -- Ocean-specific (nullable)
  bol_number text,
  port_of_loading text,
  terminal_or_pier text,
  pre_carrier text,
  exporting_carrier text,
  vessel_name text,
  vessel_flag text,
  voyage_id text,
  port_of_unloading text,
  place_of_delivery_by_on_carrier text,
  freight_terms text CHECK (freight_terms IS NULL OR freight_terms IN ('prepaid', 'collect')),
  number_of_original_bols integer,

  -- Ground-specific (nullable)
  route_number text,
  origin_terminal text,
  destination_terminal text,
  truck_plate text,
  driver_name text,
  driver_id_number text,
  driver_phone text,
  trailer_number text,
  estimated_transit_hours integer,
  border_crossing_point text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, shipment_number)
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipments_select ON shipments FOR SELECT USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY shipments_insert ON shipments FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY shipments_update ON shipments FOR UPDATE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY shipments_delete ON shipments FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_shipments
  AFTER INSERT OR UPDATE OR DELETE ON shipments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE INDEX idx_shipments_carrier ON shipments(carrier_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_modality ON shipments(modality);

-- next_shipment_number: modality-prefixed auto-increment
CREATE OR REPLACE FUNCTION next_shipment_number(p_org_id uuid, p_modality text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  next_num int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('shipment_' || p_modality || '_' || p_org_id::text));

  CASE p_modality
    WHEN 'air'    THEN v_prefix := 'AIR';
    WHEN 'ocean'  THEN v_prefix := 'OCN';
    WHEN 'ground' THEN v_prefix := 'GND';
    ELSE RAISE EXCEPTION 'Invalid modality: %', p_modality;
  END CASE;

  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(shipment_number, '[^0-9]', '', 'g'), '')::int),
    0
  ) + 1 INTO next_num
  FROM shipments
  WHERE organization_id = p_org_id AND modality = p_modality;

  RETURN v_prefix || '-' || lpad(next_num::text, 5, '0');
END;
$$;

-- Shipment status history
CREATE TABLE shipment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipment_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY ssh_select ON shipment_status_history FOR SELECT USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY ssh_insert ON shipment_status_history FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

-- ============================================================================
-- 1E. SHIPMENT_CONTAINERS TABLE (ocean support)
-- ============================================================================

CREATE TABLE shipment_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  container_number text NOT NULL,
  seal_number text,
  container_type text NOT NULL CHECK (container_type IN ('20ft','40ft','40hq','45ft','reefer_20','reefer_40')),
  tare_weight numeric(10,2),
  max_payload numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipment_containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY sc_select ON shipment_containers FOR SELECT USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY sc_insert ON shipment_containers FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY sc_update ON shipment_containers FOR UPDATE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY sc_delete ON shipment_containers FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE INDEX idx_shipment_containers_shipment ON shipment_containers(shipment_id);

CREATE TRIGGER audit_shipment_containers
  AFTER INSERT OR UPDATE OR DELETE ON shipment_containers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================================
-- 1F. SHIPMENT_DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE shipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY sd_select ON shipment_documents FOR SELECT USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY sd_insert ON shipment_documents FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY sd_delete ON shipment_documents FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE INDEX idx_shipment_documents_shipment ON shipment_documents(shipment_id);

CREATE TRIGGER audit_shipment_documents
  AFTER INSERT OR UPDATE OR DELETE ON shipment_documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================================
-- 1G. Additional indexes
-- ============================================================================

CREATE INDEX idx_hawbs_shipment ON hawbs(shipment_id);

-- ============================================================================
-- 1H. DATA MIGRATION (MAWB → Shipment)
-- ============================================================================

-- 1H.1: Seed carriers from distinct mawbs.airline values as air carriers
INSERT INTO carriers (organization_id, code, name, modality)
SELECT DISTINCT m.organization_id, COALESCE(m.airline, 'UNKNOWN'), COALESCE(m.airline, 'Unknown Airline'), 'air'
FROM mawbs m
WHERE m.airline IS NOT NULL
ON CONFLICT (organization_id, code, modality) DO NOTHING;

-- 1H.2: Insert all mawbs rows into shipments with modality='air', preserving UUIDs
INSERT INTO shipments (
  id, organization_id, warehouse_id, modality, shipment_number, carrier_id,
  destination_id, status,
  awb_number, flight_number, departure_date,
  total_pieces, total_weight_lb, total_house_bills,
  created_at, updated_at
)
SELECT
  m.id,
  m.organization_id,
  m.warehouse_id,
  'air',
  'AIR-' || lpad(row_number() OVER (PARTITION BY m.organization_id ORDER BY m.created_at)::text, 5, '0'),
  c.id,
  m.destination_id,
  CASE m.status
    WHEN 'created' THEN 'draft'
    WHEN 'ready_for_flight' THEN 'booking_confirmed'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'arrived' THEN 'arrived'
    WHEN 'delivered' THEN 'delivered'
    ELSE 'draft'
  END,
  m.mawb_number,
  m.flight_number,
  m.flight_date,
  m.total_pieces,
  m.total_weight_lb,
  m.total_hawbs,
  m.created_at,
  m.updated_at
FROM mawbs m
LEFT JOIN carriers c ON c.organization_id = m.organization_id AND c.code = m.airline AND c.modality = 'air';

-- 1H.3: Add shipment_id to hawbs, backfill from mawb_id
UPDATE hawbs SET shipment_id = mawb_id WHERE mawb_id IS NOT NULL;

-- 1H.4: Add shipment_id column to cargo_releases, backfill from mawb_id
ALTER TABLE cargo_releases ADD COLUMN shipment_id uuid REFERENCES shipments(id);
UPDATE cargo_releases SET shipment_id = mawb_id WHERE mawb_id IS NOT NULL;

-- 1H.5: Migrate mawb_status_history → shipment_status_history
INSERT INTO shipment_status_history (organization_id, shipment_id, old_status, new_status, changed_by, reason, created_at)
SELECT
  msh.organization_id,
  msh.mawb_id,
  CASE msh.old_status
    WHEN 'created' THEN 'draft'
    WHEN 'ready_for_flight' THEN 'booking_confirmed'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'arrived' THEN 'arrived'
    WHEN 'delivered' THEN 'delivered'
    ELSE msh.old_status
  END,
  CASE msh.new_status
    WHEN 'created' THEN 'draft'
    WHEN 'ready_for_flight' THEN 'booking_confirmed'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'arrived' THEN 'arrived'
    WHEN 'delivered' THEN 'delivered'
    ELSE msh.new_status
  END,
  msh.changed_by,
  msh.reason,
  msh.created_at
FROM mawb_status_history msh;

-- 1H.6: All existing hawbs already have document_type='hawb' via DEFAULT

-- Add FK constraint for hawbs.shipment_id now that shipments table exists and data is backfilled
ALTER TABLE hawbs ADD CONSTRAINT hawbs_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES shipments(id);

-- ============================================================================
-- 1I. UPDATE TARIFF RATE UNITS: per_mawb → per_shipment
-- ============================================================================

UPDATE tariff_schedules SET rate_unit = 'per_shipment' WHERE rate_unit = 'per_mawb';
UPDATE courier_tariffs SET rate_unit = 'per_shipment' WHERE rate_unit = 'per_mawb';
UPDATE handling_costs SET base_rate_unit = 'per_shipment' WHERE base_rate_unit = 'per_mawb';
UPDATE modalities SET base_rate_unit = 'per_shipment' WHERE base_rate_unit = 'per_mawb';
UPDATE courier_modality_tariffs SET rate_unit = 'per_shipment' WHERE rate_unit = 'per_mawb';

-- Drop old CHECK constraints and recreate with per_shipment
ALTER TABLE tariff_schedules DROP CONSTRAINT IF EXISTS tariff_schedules_rate_unit_check;
ALTER TABLE tariff_schedules ADD CONSTRAINT tariff_schedules_rate_unit_check
  CHECK (rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_shipment','per_hawb'));

ALTER TABLE courier_tariffs DROP CONSTRAINT IF EXISTS courier_tariffs_rate_unit_check;
ALTER TABLE courier_tariffs ADD CONSTRAINT courier_tariffs_rate_unit_check
  CHECK (rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_shipment','per_hawb'));

ALTER TABLE handling_costs DROP CONSTRAINT IF EXISTS handling_costs_base_rate_unit_check;
ALTER TABLE handling_costs ADD CONSTRAINT handling_costs_base_rate_unit_check
  CHECK (base_rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_shipment','per_hawb'));

ALTER TABLE modalities DROP CONSTRAINT IF EXISTS modalities_base_rate_unit_check;
ALTER TABLE modalities ADD CONSTRAINT modalities_base_rate_unit_check
  CHECK (base_rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_shipment','per_hawb'));

ALTER TABLE courier_modality_tariffs DROP CONSTRAINT IF EXISTS courier_modality_tariffs_rate_unit_check;
ALTER TABLE courier_modality_tariffs ADD CONSTRAINT courier_modality_tariffs_rate_unit_check
  CHECK (rate_unit IN ('flat','per_kg','per_lb','per_cbm','per_shipment','per_hawb'));

-- ============================================================================
-- 1J. UPDATE role_permissions: manifests → shipments, add carriers
-- ============================================================================

UPDATE role_permissions SET resource = 'shipments' WHERE resource = 'manifests';

INSERT INTO role_permissions (role, resource, can_create, can_read, can_update, can_delete) VALUES
  ('super_admin',          'carriers', true,  true,  true,  true),
  ('forwarder_admin',      'carriers', true,  true,  true,  false),
  ('warehouse_admin',      'carriers', false, true,  false, false),
  ('warehouse_operator',   'carriers', false, false, false, false),
  ('shipping_clerk',       'carriers', false, true,  false, false),
  ('destination_admin',    'carriers', false, true,  false, false),
  ('destination_operator', 'carriers', false, false, false, false),
  ('agency',               'carriers', false, false, false, false)
ON CONFLICT (role, resource) DO NOTHING;
