-- ============================================================================
-- no-wms — Complete MVP Database Schema
-- Migration: 20260228000000_initial_schema
-- ============================================================================

-- Enable required extensions
create extension if not exists "pg_trgm";       -- Fuzzy text matching
create extension if not exists "pgcrypto";       -- gen_random_uuid()

-- ============================================================================
-- 1. MULTI-TENANCY & AUTH
-- ============================================================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  full_name text not null,
  avatar_url text,
  locale text not null default 'es',
  timezone text not null default 'America/Guayaquil',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_org on profiles(organization_id);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role text not null check (role in (
    'super_admin', 'warehouse_admin', 'warehouse_operator',
    'shipping_clerk', 'destination_admin', 'destination_operator',
    'agency'
  )),
  warehouse_id uuid,   -- scoped to a warehouse (FK added after warehouses table)
  destination_country_id uuid, -- scoped to a destination (FK added later)
  agency_id uuid,       -- scoped to an agency (FK added later)
  created_at timestamptz not null default now(),
  unique(user_id, role, warehouse_id, destination_country_id, agency_id)
);

create index idx_user_roles_user on user_roles(user_id);
create index idx_user_roles_org on user_roles(organization_id);

-- ============================================================================
-- 2. SETTINGS (Cascading Hierarchy)
-- ============================================================================

create table settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  scope_type text not null check (scope_type in (
    'platform', 'organization', 'warehouse', 'destination', 'agency', 'user'
  )),
  scope_id uuid, -- the specific warehouse/destination/agency/user id
  key text not null,
  value jsonb not null,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, scope_type, scope_id, key)
);

create index idx_settings_lookup on settings(organization_id, scope_type, scope_id, key);

-- ============================================================================
-- 3. GEOGRAPHY & STRUCTURE
-- ============================================================================

create table warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  code text not null, -- e.g., 'MIA', 'ESP', 'CHN'
  city text,
  country text,
  timezone text not null default 'America/New_York',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, code)
);

create index idx_warehouses_org on warehouses(organization_id);

create table warehouse_zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  name text not null,
  code text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(warehouse_id, code)
);

create table warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  zone_id uuid not null references warehouse_zones(id) on delete cascade,
  name text not null,
  code text not null, -- e.g., 'A3-2' (rack A3, level 2)
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(zone_id, code)
);

create table destination_countries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  code text not null, -- ISO 3166-1 alpha-2, e.g., 'EC'
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, code)
);

create table courier_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  destination_country_id uuid not null references destination_countries(id) on delete cascade,
  code text not null, -- 'A', 'B', 'C', 'D', 'E', 'F', 'G'
  name text not null,
  max_weight_lb numeric(10,2),
  max_value_usd numeric(12,2),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(destination_country_id, code)
);

create table agencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  destination_country_id uuid not null references destination_countries(id),
  name text not null,
  code text not null, -- short identifier
  type text not null default 'corporativo' check (type in ('corporativo', 'box')),
  is_active boolean not null default true,
  default_modality text,
  credit_limit numeric(12,2),
  credit_terms_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, code)
);

create index idx_agencies_org on agencies(organization_id);
create index idx_agencies_dest on agencies(destination_country_id);

create table agency_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agency_id uuid not null references agencies(id) on delete cascade,
  contact_type text not null check (contact_type in ('admin', 'operations', 'billing', 'other')),
  name text not null,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_agency_contacts_agency on agency_contacts(agency_id);

-- Add deferred FKs on user_roles
alter table user_roles
  add constraint fk_user_roles_warehouse foreign key (warehouse_id) references warehouses(id),
  add constraint fk_user_roles_destination foreign key (destination_country_id) references destination_countries(id),
  add constraint fk_user_roles_agency foreign key (agency_id) references agencies(id);

-- ============================================================================
-- 4. CONSIGNEES (Recipients/Destinatarios)
-- ============================================================================

create table consignees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agency_id uuid not null references agencies(id),
  full_name text not null,
  cedula_ruc text, -- Ecuador national ID or tax ID
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  province text,
  postal_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_consignees_agency on consignees(agency_id);
create index idx_consignees_name_trgm on consignees using gin (full_name gin_trgm_ops);

-- ============================================================================
-- 5. WAREHOUSE RECEIPTS (WR) — Core Entity
-- ============================================================================

create table warehouse_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_id uuid not null references warehouses(id),
  wr_number text not null, -- org-scoped sequential, e.g., GLP1234
  tracking_number text not null,
  carrier text, -- FedEx, UPS, DHL, USPS, Amazon, etc.
  status text not null default 'received' check (status in (
    'received', 'in_warehouse', 'in_work_order', 'in_dispatch',
    'dispatched', 'damaged', 'abandoned'
  )),
  -- Assignment
  agency_id uuid references agencies(id),
  consignee_id uuid references consignees(id),
  -- Measurements
  actual_weight_lb numeric(10,2),
  length_in numeric(10,2),
  width_in numeric(10,2),
  height_in numeric(10,2),
  volumetric_weight_lb numeric(10,2),
  billable_weight_lb numeric(10,2), -- MAX(actual, volumetric)
  -- Content
  content_description text,   -- operator notes about content
  declared_value_usd numeric(12,2), -- Phase 2 field, exists in schema
  is_dgr boolean not null default false,
  dgr_class text,
  dgr_checklist_completed jsonb, -- configurable checklist
  -- Damage
  is_damaged boolean not null default false,
  damage_description text,
  -- Location
  warehouse_location_id uuid references warehouse_locations(id),
  sender_name text, -- who sent the package (useful for unknown WRs)
  -- Storage
  free_storage_override_days integer, -- admin can extend free period
  free_storage_override_reason text,
  -- Metadata
  pieces_count integer not null default 1,
  is_unknown boolean not null default false,
  received_at timestamptz not null default now(),
  received_by uuid not null references profiles(id),
  notes text,
  -- Offline sync
  client_id text, -- for offline dedup
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Constraints
  unique(organization_id, tracking_number), -- duplicate tracking prevention
  unique(organization_id, wr_number)
);

create index idx_wr_org on warehouse_receipts(organization_id);
create index idx_wr_warehouse on warehouse_receipts(warehouse_id);
create index idx_wr_agency on warehouse_receipts(agency_id);
create index idx_wr_status on warehouse_receipts(status);
create index idx_wr_received_at on warehouse_receipts(received_at);
-- Fuzzy search indexes
create index idx_wr_tracking_trgm on warehouse_receipts using gin (tracking_number gin_trgm_ops);
create index idx_wr_wr_number_trgm on warehouse_receipts using gin (wr_number gin_trgm_ops);
-- Full-text search
create index idx_wr_fts on warehouse_receipts using gin (
  to_tsvector('spanish',
    coalesce(tracking_number, '') || ' ' ||
    coalesce(wr_number, '') || ' ' ||
    coalesce(content_description, '') || ' ' ||
    coalesce(notes, '') || ' ' ||
    coalesce(sender_name, '')
  )
);

create table wr_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_receipt_id uuid not null references warehouse_receipts(id) on delete cascade,
  storage_path text not null, -- Supabase Storage path
  file_name text,
  file_size integer,
  is_damage_photo boolean not null default false,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_wr_photos_wr on wr_photos(warehouse_receipt_id);

create table wr_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_receipt_id uuid not null references warehouse_receipts(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create index idx_wr_status_history_wr on wr_status_history(warehouse_receipt_id);

create table wr_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_receipt_id uuid not null references warehouse_receipts(id) on delete cascade,
  content text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. UNKNOWN WRs
-- ============================================================================

create table unknown_wrs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_receipt_id uuid not null references warehouse_receipts(id) on delete cascade,
  sender_name text,
  package_type text,
  carrier text,
  -- Claim fields
  claimed_by_agency_id uuid references agencies(id),
  claimed_at timestamptz,
  claim_tracking_match text,
  claim_invoice_path text, -- Supabase Storage path for purchase invoice
  claim_verified_by uuid references profiles(id),
  claim_verified_at timestamptz,
  status text not null default 'unclaimed' check (status in ('unclaimed', 'claimed', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_unknown_wrs_org on unknown_wrs(organization_id);
create index idx_unknown_wrs_status on unknown_wrs(status);

-- ============================================================================
-- 7. WORK ORDERS
-- ============================================================================

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_id uuid not null references warehouses(id),
  wo_number text not null, -- auto-generated
  type text not null check (type in (
    'abandon', 'group', 'authorize_pickup', 'consolidate', 'delivery',
    'divide', 'ship', 'photos', 'inspection', 'inventory_count',
    'repack', 'return', 'special_request'
  )),
  status text not null default 'requested' check (status in (
    'requested', 'approved', 'in_progress', 'completed', 'cancelled', 'pending'
  )),
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  requested_by uuid not null references profiles(id),
  assigned_to uuid references profiles(id),
  agency_id uuid references agencies(id),
  instructions text,
  result_notes text, -- required for completion
  cancellation_reason text,
  -- Pickup-specific fields (for authorize_pickup type)
  pickup_date date,
  pickup_time time,
  pickup_location text,
  pickup_authorized_person text,
  pickup_contact_info text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, wo_number)
);

create index idx_wo_org on work_orders(organization_id);
create index idx_wo_warehouse on work_orders(warehouse_id);
create index idx_wo_agency on work_orders(agency_id);
create index idx_wo_status on work_orders(status);
create index idx_wo_assigned on work_orders(assigned_to);
create index idx_wo_priority_status on work_orders(priority, status);

create table work_order_items (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  warehouse_receipt_id uuid not null references warehouse_receipts(id),
  created_at timestamptz not null default now(),
  unique(work_order_id, warehouse_receipt_id)
);

create index idx_wo_items_wr on work_order_items(warehouse_receipt_id);

create table work_order_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 8. SHIPPING INSTRUCTIONS
-- ============================================================================

create table shipping_instructions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_id uuid not null references warehouses(id),
  si_number text not null, -- auto-generated
  agency_id uuid not null references agencies(id),
  destination_country_id uuid not null references destination_countries(id),
  modality text not null, -- 'courier_a'..'courier_g', 'air_cargo'
  courier_category text, -- 'A'-'G' for courier modalities
  status text not null default 'requested' check (status in (
    'requested', 'approved', 'finalized', 'manifested',
    'rejected', 'cancelled'
  )),
  consignee_id uuid not null references consignees(id),
  -- Ecuador-specific
  cedula_ruc text,
  cupo_4x4_used boolean default false,
  -- Totals (computed from items)
  total_pieces integer,
  total_actual_weight_lb numeric(10,2),
  total_volumetric_weight_lb numeric(10,2),
  total_billable_weight_lb numeric(10,2),
  total_declared_value_usd numeric(12,2),
  -- SED validation data (manual SED preparation in MVP)
  sed_validation_data jsonb,
  -- Additional charges from shipping clerk
  additional_charges jsonb, -- [{description, amount}]
  -- Approval
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  special_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, si_number)
);

create index idx_si_org on shipping_instructions(organization_id);
create index idx_si_agency on shipping_instructions(agency_id);
create index idx_si_status on shipping_instructions(status);

create table shipping_instruction_items (
  id uuid primary key default gen_random_uuid(),
  shipping_instruction_id uuid not null references shipping_instructions(id) on delete cascade,
  warehouse_receipt_id uuid not null references warehouse_receipts(id),
  created_at timestamptz not null default now(),
  unique(shipping_instruction_id, warehouse_receipt_id)
);

create index idx_si_items_wr on shipping_instruction_items(warehouse_receipt_id);

create table shipping_instruction_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  shipping_instruction_id uuid not null references shipping_instructions(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 9. MAWB, HAWB, SACAS
-- ============================================================================

create table mawbs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_id uuid not null references warehouses(id),
  mawb_number text not null, -- airline-issued, e.g., '906-13203201'
  airline text,
  flight_number text,
  flight_date date,
  destination_country_id uuid not null references destination_countries(id),
  status text not null default 'created' check (status in (
    'created', 'ready_for_flight', 'in_transit', 'arrived', 'delivered'
  )),
  total_pieces integer,
  total_weight_lb numeric(10,2),
  total_hawbs integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, mawb_number)
);

create index idx_mawbs_org on mawbs(organization_id);
create index idx_mawbs_status on mawbs(status);

create table hawbs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  mawb_id uuid references mawbs(id),
  shipping_instruction_id uuid not null references shipping_instructions(id),
  hawb_number text not null, -- configurable format, e.g., GLP12345
  pieces integer,
  weight_lb numeric(10,2),
  created_at timestamptz not null default now(),
  unique(organization_id, hawb_number)
);

create index idx_hawbs_mawb on hawbs(mawb_id);
create index idx_hawbs_si on hawbs(shipping_instruction_id);
create index idx_hawbs_number_trgm on hawbs using gin (hawb_number gin_trgm_ops);

create table mawb_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  mawb_id uuid not null references mawbs(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

-- Sacas: physical bags that group WRs
create table sacas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_id uuid not null references warehouses(id),
  saca_number text not null, -- auto-generated
  mawb_id uuid references mawbs(id),
  status text not null default 'open' check (status in ('open', 'closed', 'dispatched')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, saca_number)
);

-- saca_items links sacas to WRs (physical packages go into physical bags)
create table saca_items (
  id uuid primary key default gen_random_uuid(),
  saca_id uuid not null references sacas(id) on delete cascade,
  warehouse_receipt_id uuid not null references warehouse_receipts(id),
  created_at timestamptz not null default now(),
  unique(saca_id, warehouse_receipt_id)
);

create index idx_saca_items_wr on saca_items(warehouse_receipt_id);

-- Cargo release documents
create table cargo_releases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  mawb_id uuid references mawbs(id),
  hawb_id uuid references hawbs(id),
  document_path text, -- Supabase Storage path for generated PDF
  generated_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 10. AIRLINE RESERVATIONS
-- ============================================================================

create table airline_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  airline text not null,
  reserved_mawb_numbers jsonb not null default '[]', -- array of reserved numbers
  week_start date not null,
  week_end date not null,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 11. TARIFFS & BILLING
-- ============================================================================

create table tariff_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agency_id uuid not null references agencies(id),
  destination_country_id uuid not null references destination_countries(id),
  modality text not null,
  courier_category text,
  is_active boolean not null default true,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tariff_schedules_agency on tariff_schedules(agency_id);

create table tariff_rates (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references tariff_schedules(id) on delete cascade,
  min_weight_lb numeric(10,2) not null,
  max_weight_lb numeric(10,2) not null,
  rate_per_lb numeric(10,4) not null,
  minimum_charge numeric(10,2) default 0,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agency_id uuid not null references agencies(id),
  invoice_number text not null,
  status text not null default 'draft' check (status in (
    'draft', 'sent', 'paid', 'overdue', 'void'
  )),
  period_start date not null,
  period_end date not null,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  due_date date,
  paid_at timestamptz,
  notes text,
  document_path text, -- PDF storage path
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, invoice_number)
);

create index idx_invoices_agency on invoices(agency_id);
create index idx_invoices_status on invoices(status);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  type text not null check (type in ('shipping', 'storage', 'work_order', 'surcharge', 'other')),
  description text not null,
  warehouse_receipt_id uuid references warehouse_receipts(id),
  work_order_id uuid references work_orders(id),
  shipping_instruction_id uuid references shipping_instructions(id),
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,4) not null,
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table storage_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_receipt_id uuid not null references warehouse_receipts(id),
  charge_date date not null,
  daily_rate numeric(10,4) not null,
  amount numeric(10,2) not null,
  invoice_line_item_id uuid references invoice_line_items(id),
  created_at timestamptz not null default now(),
  unique(warehouse_receipt_id, charge_date)
);

-- ============================================================================
-- 12. TICKETS
-- ============================================================================

create table tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  ticket_number text not null,
  agency_id uuid not null references agencies(id),
  category text, -- user-defined categories
  subject text not null,
  description text,
  status text not null default 'open' check (status in (
    'open', 'in_review', 'resolved', 'closed'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_by uuid not null references profiles(id),
  assigned_to uuid references profiles(id),
  -- Origin review requirement: must be set before ticket can be closed
  origin_reviewed_at timestamptz,
  origin_reviewed_by uuid references profiles(id),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, ticket_number)
);

create index idx_tickets_org on tickets(organization_id);
create index idx_tickets_agency on tickets(agency_id);
create index idx_tickets_status on tickets(status);

-- Junction: tickets linked to WRs
create table ticket_wrs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  warehouse_receipt_id uuid not null references warehouse_receipts(id),
  unique(ticket_id, warehouse_receipt_id)
);

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  ticket_id uuid not null references tickets(id) on delete cascade,
  content text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_ticket_messages_ticket on ticket_messages(ticket_id);

create table ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  ticket_id uuid not null references tickets(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 13. NOTIFICATIONS
-- ============================================================================

create table notification_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id), -- null = system default
  event_type text not null, -- 'wr_received', 'wr_dispatched', 'wo_completed', etc.
  channel text not null default 'email' check (channel in ('email', 'in_app', 'whatsapp')),
  subject_template text,
  body_template text not null,
  locale text not null default 'es',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  recipient_user_id uuid references profiles(id),
  recipient_email text,
  event_type text not null,
  channel text not null default 'email',
  subject text,
  body text not null,
  metadata jsonb, -- related entity IDs, etc.
  sent_at timestamptz,
  read_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'read')),
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient on notifications(recipient_user_id);
create index idx_notifications_status on notifications(status);

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  event_type text not null,
  channel text not null default 'email',
  is_enabled boolean not null default true,
  unique(user_id, event_type, channel)
);

create table mass_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  title text not null,
  body text not null,
  type text not null default 'announcement' check (type in ('alert', 'announcement', 'delay')),
  target_agencies jsonb, -- null = all agencies, or array of agency_ids
  created_by uuid not null references profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 14. PICKUP REQUESTS
-- ============================================================================

create table pickup_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agency_id uuid references agencies(id),
  status text not null default 'requested' check (status in (
    'requested', 'scheduled', 'completed', 'cancelled'
  )),
  pickup_date date,
  pickup_time time,
  pickup_location text,
  authorized_person_name text,
  authorized_person_id text, -- cedula
  contact_phone text,
  contact_email text,
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Junction: pickup requests linked to WRs
create table pickup_request_wrs (
  id uuid primary key default gen_random_uuid(),
  pickup_request_id uuid not null references pickup_requests(id) on delete cascade,
  warehouse_receipt_id uuid not null references warehouse_receipts(id),
  unique(pickup_request_id, warehouse_receipt_id)
);

-- ============================================================================
-- 15. SEARCH
-- ============================================================================

create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null, -- serialized filter state
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recent_searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  user_id uuid not null references profiles(id) on delete cascade,
  query text not null,
  result_count integer,
  created_at timestamptz not null default now()
);

create index idx_recent_searches_user on recent_searches(user_id, created_at desc);

-- ============================================================================
-- 16. WR TRANSFER REQUESTS
-- ============================================================================

create table wr_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_receipt_id uuid not null references warehouse_receipts(id),
  from_agency_id uuid not null references agencies(id),
  to_agency_id uuid not null references agencies(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  authorization_doc_path text, -- Supabase Storage path
  invoice_doc_path text, -- Supabase Storage path
  requested_by uuid not null references profiles(id),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 17. AUDIT LOG
-- ============================================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  user_id uuid references profiles(id),
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  record_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_org on audit_logs(organization_id);
create index idx_audit_logs_table on audit_logs(table_name, record_id);
create index idx_audit_logs_created on audit_logs(created_at);

-- Audit trigger function
create or replace function audit_trigger_fn()
returns trigger as $$
begin
  insert into audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    coalesce(new.organization_id, old.organization_id),
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('DELETE', 'UPDATE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 18. OFFLINE SYNC
-- ============================================================================

create table sync_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  client_id text not null, -- for idempotency
  entity_type text not null, -- 'warehouse_receipt', etc.
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'synced', 'conflict', 'failed')),
  conflict_reason text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique(organization_id, client_id)
);

-- ============================================================================
-- 19. ATTACH AUDIT TRIGGERS to business tables
-- ============================================================================

create trigger audit_organizations after insert or update or delete on organizations for each row execute function audit_trigger_fn();
create trigger audit_warehouses after insert or update or delete on warehouses for each row execute function audit_trigger_fn();
create trigger audit_agencies after insert or update or delete on agencies for each row execute function audit_trigger_fn();
create trigger audit_warehouse_receipts after insert or update or delete on warehouse_receipts for each row execute function audit_trigger_fn();
create trigger audit_work_orders after insert or update or delete on work_orders for each row execute function audit_trigger_fn();
create trigger audit_shipping_instructions after insert or update or delete on shipping_instructions for each row execute function audit_trigger_fn();
create trigger audit_mawbs after insert or update or delete on mawbs for each row execute function audit_trigger_fn();
create trigger audit_hawbs after insert or update or delete on hawbs for each row execute function audit_trigger_fn();
create trigger audit_sacas after insert or update or delete on sacas for each row execute function audit_trigger_fn();
create trigger audit_invoices after insert or update or delete on invoices for each row execute function audit_trigger_fn();
create trigger audit_tickets after insert or update or delete on tickets for each row execute function audit_trigger_fn();
create trigger audit_settings after insert or update or delete on settings for each row execute function audit_trigger_fn();
create trigger audit_consignees after insert or update or delete on consignees for each row execute function audit_trigger_fn();
create trigger audit_tariff_schedules after insert or update or delete on tariff_schedules for each row execute function audit_trigger_fn();

-- ============================================================================
-- 20. SETTINGS RESOLUTION FUNCTION
-- ============================================================================

create or replace function resolve_setting(
  p_org_id uuid,
  p_key text,
  p_warehouse_id uuid default null,
  p_destination_id uuid default null,
  p_agency_id uuid default null,
  p_user_id uuid default null
)
returns jsonb as $$
declare
  result jsonb;
begin
  -- Walk from most specific to least specific
  -- 1. User level
  if p_user_id is not null then
    select value into result from settings
    where organization_id = p_org_id and scope_type = 'user' and scope_id = p_user_id and key = p_key;
    if found then return result; end if;
  end if;

  -- 2. Agency level
  if p_agency_id is not null then
    select value into result from settings
    where organization_id = p_org_id and scope_type = 'agency' and scope_id = p_agency_id and key = p_key;
    if found then return result; end if;
  end if;

  -- 3. Destination country level
  if p_destination_id is not null then
    select value into result from settings
    where organization_id = p_org_id and scope_type = 'destination' and scope_id = p_destination_id and key = p_key;
    if found then return result; end if;
  end if;

  -- 4. Warehouse level
  if p_warehouse_id is not null then
    select value into result from settings
    where organization_id = p_org_id and scope_type = 'warehouse' and scope_id = p_warehouse_id and key = p_key;
    if found then return result; end if;
  end if;

  -- 5. Organization level
  select value into result from settings
  where organization_id = p_org_id and scope_type = 'organization' and scope_id = p_org_id and key = p_key;
  if found then return result; end if;

  -- 6. Platform level
  select value into result from settings
  where scope_type = 'platform' and organization_id is null and key = p_key;
  if found then return result; end if;

  -- Not found
  return null;
end;
$$ language plpgsql stable security definer;

-- ============================================================================
-- 21. UPDATED_AT TRIGGER
-- ============================================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
create trigger set_updated_at before update on organizations for each row execute function update_updated_at();
create trigger set_updated_at before update on profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on settings for each row execute function update_updated_at();
create trigger set_updated_at before update on warehouses for each row execute function update_updated_at();
create trigger set_updated_at before update on destination_countries for each row execute function update_updated_at();
create trigger set_updated_at before update on agencies for each row execute function update_updated_at();
create trigger set_updated_at before update on consignees for each row execute function update_updated_at();
create trigger set_updated_at before update on warehouse_receipts for each row execute function update_updated_at();
create trigger set_updated_at before update on unknown_wrs for each row execute function update_updated_at();
create trigger set_updated_at before update on work_orders for each row execute function update_updated_at();
create trigger set_updated_at before update on shipping_instructions for each row execute function update_updated_at();
create trigger set_updated_at before update on mawbs for each row execute function update_updated_at();
create trigger set_updated_at before update on sacas for each row execute function update_updated_at();
create trigger set_updated_at before update on invoices for each row execute function update_updated_at();
create trigger set_updated_at before update on tickets for each row execute function update_updated_at();
create trigger set_updated_at before update on tariff_schedules for each row execute function update_updated_at();
create trigger set_updated_at before update on airline_reservations for each row execute function update_updated_at();
create trigger set_updated_at before update on pickup_requests for each row execute function update_updated_at();
create trigger set_updated_at before update on wr_transfer_requests for each row execute function update_updated_at();

-- ============================================================================
-- 22. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all business tables
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table settings enable row level security;
alter table warehouses enable row level security;
alter table warehouse_zones enable row level security;
alter table warehouse_locations enable row level security;
alter table destination_countries enable row level security;
alter table courier_categories enable row level security;
alter table agencies enable row level security;
alter table agency_contacts enable row level security;
alter table consignees enable row level security;
alter table warehouse_receipts enable row level security;
alter table wr_photos enable row level security;
alter table wr_status_history enable row level security;
alter table wr_notes enable row level security;
alter table unknown_wrs enable row level security;
alter table work_orders enable row level security;
alter table work_order_items enable row level security;
alter table work_order_status_history enable row level security;
alter table shipping_instructions enable row level security;
alter table shipping_instruction_items enable row level security;
alter table shipping_instruction_status_history enable row level security;
alter table mawbs enable row level security;
alter table hawbs enable row level security;
alter table mawb_status_history enable row level security;
alter table sacas enable row level security;
alter table saca_items enable row level security;
alter table cargo_releases enable row level security;
alter table airline_reservations enable row level security;
alter table tariff_schedules enable row level security;
alter table tariff_rates enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table storage_charges enable row level security;
alter table tickets enable row level security;
alter table ticket_wrs enable row level security;
alter table ticket_messages enable row level security;
alter table ticket_status_history enable row level security;
alter table notification_templates enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table mass_notifications enable row level security;
alter table pickup_requests enable row level security;
alter table pickup_request_wrs enable row level security;
alter table saved_searches enable row level security;
alter table recent_searches enable row level security;
alter table wr_transfer_requests enable row level security;
alter table sync_queue enable row level security;
alter table audit_logs enable row level security;

-- Helper function: get the current user's organization_id
create or replace function auth_org_id()
returns uuid as $$
  select organization_id from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Helper function: check if user has a specific role
create or replace function auth_has_role(p_role text)
returns boolean as $$
  select exists(
    select 1 from user_roles
    where user_id = auth.uid() and role = p_role
  );
$$ language sql stable security definer;

-- Helper function: get agency_ids the user belongs to (for agency role)
create or replace function auth_agency_ids()
returns uuid[] as $$
  select array_agg(agency_id) from user_roles
  where user_id = auth.uid() and role = 'agency' and agency_id is not null;
$$ language sql stable security definer;

-- ── Organization-scoped policies (applied to most tables) ──

-- Macro: create org-scoped policies for a table
-- We'll create them explicitly for the main tables

-- Organizations: users can see their own org
create policy "org_select" on organizations for select using (
  id = auth_org_id() or auth_has_role('super_admin')
);

-- Profiles: users can see profiles in their org
create policy "profiles_select" on profiles for select using (organization_id = auth_org_id());
create policy "profiles_update_self" on profiles for update using (id = auth.uid());

-- User roles: org-scoped
create policy "user_roles_select" on user_roles for select using (organization_id = auth_org_id());

-- Settings: org-scoped + platform settings visible to all
create policy "settings_select" on settings for select using (
  organization_id = auth_org_id() or (scope_type = 'platform' and organization_id is null)
);

-- Generic org-scoped policy for tables with organization_id
-- We create a function and apply it programmatically to key tables

create or replace function _rls_org_check(org_id uuid)
returns boolean as $$
  select org_id = auth_org_id();
$$ language sql stable security definer;

-- Apply org-scoped select policies to all business tables
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'warehouses', 'warehouse_zones', 'warehouse_locations',
    'destination_countries', 'courier_categories', 'agencies', 'agency_contacts',
    'consignees', 'warehouse_receipts', 'wr_photos', 'wr_status_history', 'wr_notes',
    'unknown_wrs', 'work_orders', 'work_order_items', 'work_order_status_history',
    'shipping_instructions', 'shipping_instruction_items', 'shipping_instruction_status_history',
    'mawbs', 'hawbs', 'mawb_status_history', 'sacas', 'saca_items', 'cargo_releases',
    'airline_reservations', 'tariff_schedules', 'tariff_rates',
    'invoices', 'invoice_line_items', 'storage_charges',
    'tickets', 'ticket_wrs', 'ticket_messages', 'ticket_status_history',
    'notification_templates', 'notifications', 'mass_notifications',
    'pickup_requests', 'pickup_request_wrs',
    'saved_searches', 'recent_searches',
    'wr_transfer_requests', 'sync_queue', 'audit_logs'
  ])
  loop
    execute format(
      'create policy "org_select" on %I for select using (organization_id = auth_org_id())',
      tbl
    );
    execute format(
      'create policy "org_insert" on %I for insert with check (organization_id = auth_org_id())',
      tbl
    );
    execute format(
      'create policy "org_update" on %I for update using (organization_id = auth_org_id())',
      tbl
    );
  end loop;
end;
$$;

-- Notification preferences: user can manage their own
create policy "notif_prefs_select" on notification_preferences for select using (user_id = auth.uid());
create policy "notif_prefs_insert" on notification_preferences for insert with check (user_id = auth.uid());
create policy "notif_prefs_update" on notification_preferences for update using (user_id = auth.uid());

-- Junction tables without organization_id need special handling
-- work_order_items, shipping_instruction_items, saca_items, ticket_wrs, pickup_request_wrs
-- These inherit access from their parent table via JOINs (already covered by parent RLS)

-- Agency-scoped additional restriction: agency users only see their data
-- Applied as additional policies on key tables

create policy "agency_wr_select" on warehouse_receipts for select using (
  -- Non-agency roles can see all WRs in their org (covered by org_select)
  -- Agency role can only see WRs assigned to their agency
  not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

create policy "agency_si_select" on shipping_instructions for select using (
  not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

create policy "agency_wo_select" on work_orders for select using (
  not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

create policy "agency_ticket_select" on tickets for select using (
  not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

create policy "agency_invoice_select" on invoices for select using (
  not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);
