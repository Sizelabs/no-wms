-- ============================================================================
-- Migration: Destinations & enablement chain
-- Renames courriers → couriers, destination_countries → destinations (city-level),
-- creates junction tables (warehouse_destinations, courier_warehouses,
-- courier_warehouse_destinations, agency_destinations), redesigns tariff_schedules
-- to merge weight brackets from tariff_rates, drops old tables.
-- ============================================================================

-- ============================================================================
-- 1a. RENAME courriers → couriers (must complete before dependent objects)
-- ============================================================================

-- Drop RLS policies on courrier_coverage
drop policy if exists courrier_coverage_select on courrier_coverage;
drop policy if exists courrier_coverage_insert on courrier_coverage;
drop policy if exists courrier_coverage_update on courrier_coverage;
drop policy if exists courrier_coverage_delete on courrier_coverage;

-- Drop RLS policies on courriers
drop policy if exists courriers_select on courriers;
drop policy if exists courriers_insert on courriers;
drop policy if exists courriers_update on courriers;
drop policy if exists courriers_delete on courriers;

-- Rename table
alter table courriers rename to couriers;

-- Rename FK columns
alter table agencies rename column courrier_id to courier_id;
alter table user_roles rename column courrier_id to courier_id;
alter table courrier_coverage rename column courrier_id to courier_id;

-- Rename indexes
alter index idx_agencies_courrier rename to idx_agencies_courier;

-- Rename triggers
alter trigger set_courriers_updated_at on couriers rename to set_couriers_updated_at;
alter trigger audit_courriers on couriers rename to audit_couriers;

-- Drop agencies policy that depends on auth_courrier_ids() before dropping the function
drop policy if exists "org_select" on agencies;

-- Drop old auth helper
drop function if exists auth_courrier_ids();

-- Create new auth helper
create or replace function auth_courier_ids() returns uuid[]
language sql stable security definer as $$
  select coalesce(
    array_agg(courier_id) filter (where courier_id is not null),
    '{}'::uuid[]
  )
  from user_roles
  where user_id = auth.uid()
    and role in ('destination_admin', 'destination_operator')
    and courier_id is not null;
$$;

-- Recreate RLS policies on couriers
create policy couriers_select on couriers for select using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or id = any(auth_courier_ids())
    )
  )
);
create policy couriers_insert on couriers for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy couriers_update on couriers for update using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or id = any(auth_courier_ids())
    )
  )
);
create policy couriers_delete on couriers for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- Temporarily recreate RLS on courrier_coverage (will be dropped later)
create policy courrier_coverage_select on courrier_coverage for select using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or courier_id = any(auth_courier_ids())
    )
  )
);
create policy courrier_coverage_insert on courrier_coverage for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy courrier_coverage_update on courrier_coverage for update using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or courier_id = any(auth_courier_ids())
    )
  )
);
create policy courrier_coverage_delete on courrier_coverage for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- Update agencies RLS to use auth_courier_ids()
drop policy if exists "org_select" on agencies;
create policy "org_select" on agencies for select using (
  organization_id = auth_org_id()
  and (
    not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
    or courier_id = any(auth_courier_ids())
  )
);

-- ============================================================================
-- 1b. CREATE destinations TABLE (replaces destination_countries)
-- ============================================================================

create table destinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  city text not null,
  country_code text not null,
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, city, country_code)
);

-- Migrate data from destination_countries (preserves UUIDs)
insert into destinations (id, organization_id, city, country_code, currency, is_active, created_at, updated_at)
select id, organization_id, name as city, code as country_code, currency, is_active, created_at, updated_at
from destination_countries;

-- Enable RLS
alter table destinations enable row level security;

create policy destinations_select on destinations for select using (
  auth_has_role('super_admin') or organization_id = auth_org_id()
);
create policy destinations_insert on destinations for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy destinations_update on destinations for update using (
  auth_has_role('super_admin') or organization_id = auth_org_id()
);
create policy destinations_delete on destinations for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- Triggers
create trigger set_destinations_updated_at
  before update on destinations
  for each row execute function update_updated_at();

create trigger audit_destinations
  after insert or update or delete on destinations
  for each row execute function audit_trigger_fn();

-- ============================================================================
-- 1c. CREATE junction tables
-- ============================================================================

-- warehouse_destinations: which destinations a warehouse serves
create table warehouse_destinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  destination_id uuid not null references destinations(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(warehouse_id, destination_id)
);

alter table warehouse_destinations enable row level security;

create policy wd_select on warehouse_destinations for select using (
  auth_has_role('super_admin') or organization_id = auth_org_id()
);
create policy wd_insert on warehouse_destinations for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy wd_update on warehouse_destinations for update using (
  auth_has_role('super_admin') or organization_id = auth_org_id()
);
create policy wd_delete on warehouse_destinations for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- courier_warehouses: which warehouses a courier operates from
create table courier_warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  courier_id uuid not null references couriers(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(courier_id, warehouse_id)
);

alter table courier_warehouses enable row level security;

create policy cw_select on courier_warehouses for select using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or courier_id = any(auth_courier_ids())
    )
  )
);
create policy cw_insert on courier_warehouses for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy cw_update on courier_warehouses for update using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or courier_id = any(auth_courier_ids())
    )
  )
);
create policy cw_delete on courier_warehouses for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- courier_warehouse_destinations: per courier-warehouse, which destinations + routing info
create table courier_warehouse_destinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  courier_warehouse_id uuid not null references courier_warehouses(id) on delete cascade,
  destination_id uuid not null references destinations(id) on delete cascade,
  is_active boolean not null default true,
  base_rate numeric(10,2),
  rate_per_kg numeric(10,4),
  transit_days integer,
  cutoff_day_of_week smallint check (cutoff_day_of_week between 0 and 6),
  currency_code char(3) default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(courier_warehouse_id, destination_id)
);

alter table courier_warehouse_destinations enable row level security;

create policy cwd_select on courier_warehouse_destinations for select using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or exists (
        select 1 from courier_warehouses cw
        where cw.id = courier_warehouse_destinations.courier_warehouse_id
          and cw.courier_id = any(auth_courier_ids())
      )
    )
  )
);
create policy cwd_insert on courier_warehouse_destinations for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy cwd_update on courier_warehouse_destinations for update using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or exists (
        select 1 from courier_warehouses cw
        where cw.id = courier_warehouse_destinations.courier_warehouse_id
          and cw.courier_id = any(auth_courier_ids())
      )
    )
  )
);
create policy cwd_delete on courier_warehouse_destinations for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- Triggers on courier_warehouse_destinations
create trigger set_cwd_updated_at
  before update on courier_warehouse_destinations
  for each row execute function update_updated_at();

-- agency_destinations: which destinations an agency serves
create table agency_destinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  destination_id uuid not null references destinations(id) on delete cascade,
  is_home boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(agency_id, destination_id)
);

-- Partial unique index: only one home per agency
create unique index idx_agency_dest_home on agency_destinations(agency_id) where is_home = true;

alter table agency_destinations enable row level security;

create policy ad_select on agency_destinations for select using (
  auth_has_role('super_admin') or organization_id = auth_org_id()
);
create policy ad_insert on agency_destinations for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy ad_update on agency_destinations for update using (
  auth_has_role('super_admin') or organization_id = auth_org_id()
);
create policy ad_delete on agency_destinations for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- ============================================================================
-- 1d. RENAME FK columns in existing tables
-- ============================================================================

-- courier_categories
alter table courier_categories rename column destination_country_id to destination_id;

-- shipping_instructions
alter table shipping_instructions rename column destination_country_id to destination_id;

-- mawbs
alter table mawbs rename column destination_country_id to destination_id;

-- user_roles
alter table user_roles rename column destination_country_id to destination_id;

-- agencies: DROP destination_country_id (replaced by agency_destinations junction)
-- First, migrate data to agency_destinations
insert into agency_destinations (organization_id, agency_id, destination_id, is_home, is_active)
select organization_id, id, destination_country_id, true, is_active
from agencies
where destination_country_id is not null;

-- Now drop the column
alter table agencies drop column destination_country_id;

-- ============================================================================
-- 1e. REDESIGN tariff_schedules (two-sided rates, merge weight brackets)
-- ============================================================================

-- Add new columns
alter table tariff_schedules
  add column courier_warehouse_destination_id uuid references courier_warehouse_destinations(id),
  add column rate_type text not null default 'agency_rate'
    check (rate_type in ('courier_cost', 'agency_rate')),
  add column min_weight_kg numeric(10,2) not null default 0,
  add column max_weight_kg numeric(10,2) not null default 999.99,
  add column rate_per_kg numeric(10,4) not null default 0,
  add column minimum_charge numeric(10,2) default 0;

-- Migrate existing tariff_rates data into tariff_schedules
-- Each tariff_rate becomes a new row inheriting schedule metadata
insert into tariff_schedules (
  organization_id, agency_id, destination_country_id, modality, courier_category,
  is_active, effective_from, effective_to,
  rate_type, min_weight_kg, max_weight_kg, rate_per_kg, minimum_charge,
  created_at, updated_at
)
select
  ts.organization_id, ts.agency_id, ts.destination_country_id, ts.modality, ts.courier_category,
  ts.is_active, ts.effective_from, ts.effective_to,
  'agency_rate',
  round(tr.min_weight_lb * 0.453592, 2),
  round(tr.max_weight_lb * 0.453592, 2),
  round(tr.rate_per_lb / 0.453592, 4),
  tr.minimum_charge,
  ts.created_at, ts.updated_at
from tariff_rates tr
join tariff_schedules ts on ts.id = tr.schedule_id;

-- Delete the original schedule rows (which had no weight brackets)
delete from tariff_schedules where min_weight_kg = 0 and max_weight_kg = 999.99 and rate_per_kg = 0
  and id in (select distinct schedule_id from tariff_rates);

-- Make agency_id nullable (null = courier_cost, populated = agency_rate)
alter table tariff_schedules alter column agency_id drop not null;

-- Rename destination_country_id → destination_id on tariff_schedules
alter table tariff_schedules rename column destination_country_id to destination_id;

-- Add consistency constraint
alter table tariff_schedules add constraint rate_type_agency_consistency check (
  (rate_type = 'courier_cost' and agency_id is null) or
  (rate_type = 'agency_rate' and agency_id is not null)
);

-- Drop tariff_rates table (policies first if any)
drop policy if exists "org_select" on tariff_rates;
drop policy if exists "org_insert" on tariff_rates;
drop policy if exists "org_update" on tariff_rates;
drop table tariff_rates;

-- ============================================================================
-- 1f. VALIDATION triggers
-- ============================================================================

-- Trigger 1: Prevent overlapping weight brackets on tariff_schedules
create or replace function check_tariff_bracket_overlap() returns trigger as $$
begin
  if exists (
    select 1 from tariff_schedules
    where courier_warehouse_destination_id is not distinct from new.courier_warehouse_destination_id
      and coalesce(agency_id, '00000000-0000-0000-0000-000000000000') =
          coalesce(new.agency_id, '00000000-0000-0000-0000-000000000000')
      and rate_type = new.rate_type
      and modality = new.modality
      and coalesce(courier_category, '') = coalesce(new.courier_category, '')
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000')
      and new.min_weight_kg < max_weight_kg
      and new.max_weight_kg > min_weight_kg
  ) then
    raise exception 'Overlapping weight bracket for this route/rate_type/modality combination';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger check_tariff_overlap
  before insert or update on tariff_schedules
  for each row execute function check_tariff_bracket_overlap();

-- Trigger 2: Validate courier_warehouse_destination against warehouse_destinations
create or replace function check_cwd_destination_enabled() returns trigger as $$
begin
  if not exists (
    select 1 from warehouse_destinations wd
    join courier_warehouses cw on cw.id = new.courier_warehouse_id
    where wd.warehouse_id = cw.warehouse_id
      and wd.destination_id = new.destination_id
  ) then
    raise exception 'Destination not enabled for this warehouse — enable it in warehouse_destinations first';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger check_cwd_destination
  before insert or update on courier_warehouse_destinations
  for each row execute function check_cwd_destination_enabled();

-- ============================================================================
-- 1g. DROP old tables
-- ============================================================================

-- Drop courrier_coverage (RLS already dropped and re-created above, drop again to be safe)
drop policy if exists courrier_coverage_select on courrier_coverage;
drop policy if exists courrier_coverage_insert on courrier_coverage;
drop policy if exists courrier_coverage_update on courrier_coverage;
drop policy if exists courrier_coverage_delete on courrier_coverage;
drop table courrier_coverage;

-- Drop destination_countries
drop policy if exists "org_select" on destination_countries;
drop policy if exists "org_insert" on destination_countries;
drop policy if exists "org_update" on destination_countries;

-- Must drop triggers and audit trigger references
drop trigger if exists set_updated_at on destination_countries;
drop trigger if exists audit_destination_countries on destination_countries;

-- Drop FK constraints referencing destination_countries before dropping it
-- The renamed columns now point to destinations, so we need to re-point them
-- courier_categories
alter table courier_categories drop constraint if exists courier_categories_destination_country_id_fkey;
alter table courier_categories add constraint courier_categories_destination_id_fkey
  foreign key (destination_id) references destinations(id) on delete cascade;

-- shipping_instructions
alter table shipping_instructions drop constraint if exists shipping_instructions_destination_country_id_fkey;
alter table shipping_instructions add constraint shipping_instructions_destination_id_fkey
  foreign key (destination_id) references destinations(id);

-- mawbs
alter table mawbs drop constraint if exists mawbs_destination_country_id_fkey;
alter table mawbs add constraint mawbs_destination_id_fkey
  foreign key (destination_id) references destinations(id);

-- user_roles
alter table user_roles drop constraint if exists fk_user_roles_destination;
alter table user_roles add constraint user_roles_destination_id_fkey
  foreign key (destination_id) references destinations(id);

-- tariff_schedules (already renamed to destination_id)
alter table tariff_schedules drop constraint if exists tariff_schedules_destination_country_id_fkey;
alter table tariff_schedules add constraint tariff_schedules_destination_id_fkey
  foreign key (destination_id) references destinations(id);

-- Now drop destination_countries
drop table destination_countries;
