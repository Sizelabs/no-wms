-- ============================================================================
-- Migration: Tariff system redesign
-- - Creates shipping_categories (replaces courier_categories)
-- - Drops & recreates tariff_schedules with two-sided rate chain + base/override
-- - Creates tariff_brackets (separate header + brackets)
-- - Drops courier_categories
-- - Removes rate fields from courier_warehouse_destinations
-- - Adds get_applicable_tariff() lookup function
-- ============================================================================

-- ============================================================================
-- 1. NEW TABLE: shipping_categories
-- ============================================================================

create table shipping_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  country_code text not null,
  code text not null,
  name text not null,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, country_code, code)
);

alter table shipping_categories enable row level security;

create policy sc_select on shipping_categories for select using (
  auth_has_role('super_admin') or organization_id = auth_org_id()
);
create policy sc_insert on shipping_categories for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy sc_update on shipping_categories for update using (
  auth_has_role('super_admin') or organization_id = auth_org_id()
);
create policy sc_delete on shipping_categories for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

create trigger set_shipping_categories_updated_at
  before update on shipping_categories
  for each row execute function update_updated_at();

create trigger audit_shipping_categories
  after insert or update or delete on shipping_categories
  for each row execute function audit_trigger_fn();

-- ============================================================================
-- 2. DROP & RECREATE tariff_schedules
-- ============================================================================

-- Drop existing RLS policies
drop policy if exists "org_select" on tariff_schedules;
drop policy if exists "org_insert" on tariff_schedules;
drop policy if exists "org_update" on tariff_schedules;

-- Drop existing triggers
drop trigger if exists check_tariff_overlap on tariff_schedules;
drop trigger if exists set_tariff_schedules_updated_at on tariff_schedules;
drop trigger if exists audit_tariff_schedules on tariff_schedules;

-- Drop the old overlap function
drop function if exists check_tariff_bracket_overlap();

-- Drop the table
drop table if exists tariff_schedules cascade;

-- Recreate with new schema
create table tariff_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,

  -- Which side of the rate chain
  tariff_side text not null check (tariff_side in ('forwarder_to_courier', 'courier_to_agency')),

  -- Customer targeting (null = base rate for all customers on this side)
  courier_id uuid references couriers(id) on delete cascade,
  agency_id uuid references agencies(id) on delete cascade,

  -- What is being tariffed
  tariff_type text not null check (tariff_type in ('shipping', 'work_order')),

  -- Shipping dimensions (both optional — null = catch-all for that dimension)
  destination_id uuid references destinations(id) on delete cascade,
  modality text check (modality in (
    'courier_a','courier_b','courier_c','courier_d',
    'courier_e','courier_f','courier_g','air_cargo'
  )),
  shipping_category_id uuid references shipping_categories(id) on delete set null,

  -- Work order dimensions
  work_order_type text,
  base_fee numeric(10,2) not null default 0.00,

  -- Weight/volume unit for brackets
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb', 'volumetric')),
  volumetric_divisor numeric(10,2),

  currency text not null default 'USD',
  is_active boolean not null default true,
  effective_from date not null,
  effective_to date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints
alter table tariff_schedules add constraint tariff_type_fields check (
  (tariff_type = 'shipping' and destination_id is not null and work_order_type is null)
  or (tariff_type = 'work_order' and work_order_type is not null
      and destination_id is null and shipping_category_id is null and modality is null)
);

alter table tariff_schedules add constraint c2a_needs_courier check (
  tariff_side != 'courier_to_agency' or courier_id is not null
);

alter table tariff_schedules add constraint agency_only_on_c2a check (
  agency_id is null or tariff_side = 'courier_to_agency'
);

alter table tariff_schedules add constraint volumetric_needs_divisor check (
  weight_unit != 'volumetric' or volumetric_divisor is not null
);

-- Uniqueness index
create unique index tariff_schedules_unique on tariff_schedules (
  organization_id,
  tariff_side,
  coalesce(courier_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(agency_id, '00000000-0000-0000-0000-000000000000'),
  tariff_type,
  coalesce(destination_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(modality, '__none__'),
  coalesce(shipping_category_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(work_order_type, '__none__'),
  effective_from
);

-- RLS
alter table tariff_schedules enable row level security;

create policy ts_select on tariff_schedules for select using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or courier_id = any(auth_courier_ids())
    )
  )
);
create policy ts_insert on tariff_schedules for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy ts_update on tariff_schedules for update using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or courier_id = any(auth_courier_ids())
    )
  )
);
create policy ts_delete on tariff_schedules for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- Triggers
create trigger set_tariff_schedules_updated_at
  before update on tariff_schedules
  for each row execute function update_updated_at();

create trigger audit_tariff_schedules
  after insert or update or delete on tariff_schedules
  for each row execute function audit_trigger_fn();

-- ============================================================================
-- 3. NEW TABLE: tariff_brackets
-- ============================================================================

create table tariff_brackets (
  id uuid primary key default gen_random_uuid(),
  tariff_schedule_id uuid not null references tariff_schedules(id) on delete cascade,
  min_weight numeric(10,2) not null,
  max_weight numeric(10,2) not null,
  rate_per_unit numeric(10,4) not null,
  minimum_charge numeric(10,2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint min_lt_max check (max_weight > min_weight)
);

alter table tariff_brackets enable row level security;

-- Inherit access through tariff_schedule_id join
create policy tb_select on tariff_brackets for select using (
  exists (
    select 1 from tariff_schedules ts
    where ts.id = tariff_brackets.tariff_schedule_id
      and (
        auth_has_role('super_admin')
        or (
          ts.organization_id = auth_org_id()
          and (
            not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
            or ts.courier_id = any(auth_courier_ids())
          )
        )
      )
  )
);
create policy tb_insert on tariff_brackets for insert with check (
  exists (
    select 1 from tariff_schedules ts
    where ts.id = tariff_brackets.tariff_schedule_id
      and (ts.organization_id = auth_org_id() or auth_has_role('super_admin'))
  )
);
create policy tb_update on tariff_brackets for update using (
  exists (
    select 1 from tariff_schedules ts
    where ts.id = tariff_brackets.tariff_schedule_id
      and (
        auth_has_role('super_admin')
        or (
          ts.organization_id = auth_org_id()
          and (
            not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
            or ts.courier_id = any(auth_courier_ids())
          )
        )
      )
  )
);
create policy tb_delete on tariff_brackets for delete using (
  exists (
    select 1 from tariff_schedules ts
    where ts.id = tariff_brackets.tariff_schedule_id
      and (ts.organization_id = auth_org_id() or auth_has_role('super_admin'))
  )
);

-- Triggers
create trigger set_tariff_brackets_updated_at
  before update on tariff_brackets
  for each row execute function update_updated_at();

-- Overlap prevention trigger
create or replace function check_bracket_overlap()
returns trigger as $$
begin
  if exists (
    select 1 from tariff_brackets
    where tariff_schedule_id = new.tariff_schedule_id
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000')
      and min_weight < new.max_weight
      and max_weight > new.min_weight
  ) then
    raise exception 'Weight bracket overlaps with existing bracket';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_bracket_overlap
  before insert or update on tariff_brackets
  for each row execute function check_bracket_overlap();

-- ============================================================================
-- 4. DROP courier_categories
-- ============================================================================

drop policy if exists "org_select" on courier_categories;
drop policy if exists "org_insert" on courier_categories;
drop policy if exists "org_update" on courier_categories;
drop table if exists courier_categories cascade;

-- ============================================================================
-- 5. REMOVE rate fields from courier_warehouse_destinations
-- ============================================================================

alter table courier_warehouse_destinations
  drop column if exists base_rate,
  drop column if exists rate_per_kg;

-- ============================================================================
-- 6. TARIFF LOOKUP FUNCTION
-- ============================================================================

create or replace function get_applicable_tariff(
  p_org_id uuid,
  p_tariff_side text,
  p_customer_id uuid,
  p_courier_id uuid,
  p_tariff_type text,
  p_destination_id uuid,
  p_modality text,
  p_category_id uuid,
  p_work_order_type text,
  p_weight numeric
) returns table (
  schedule_id uuid,
  base_fee numeric,
  rate_per_unit numeric,
  minimum_charge numeric,
  weight_unit text,
  currency text
) as $$
begin
  if p_tariff_side = 'courier_to_agency' and p_courier_id is null then
    raise exception 'p_courier_id must not be null when tariff_side is courier_to_agency';
  end if;

  return query
  select
    ts.id,
    ts.base_fee,
    tb.rate_per_unit,
    tb.minimum_charge,
    ts.weight_unit,
    ts.currency
  from tariff_schedules ts
  left join tariff_brackets tb on tb.tariff_schedule_id = ts.id
    and tb.min_weight <= p_weight
    and tb.max_weight > p_weight
  where ts.organization_id = p_org_id
    and ts.tariff_side = p_tariff_side
    and ts.tariff_type = p_tariff_type
    and ts.is_active = true
    and ts.effective_from <= current_date
    and (ts.effective_to is null or ts.effective_to >= current_date)
    -- Type-specific filters
    and (p_tariff_type = 'work_order' or ts.destination_id = p_destination_id)
    and (p_tariff_type = 'shipping' or ts.work_order_type = p_work_order_type)
    -- Customer match: specific or base
    and case
      when p_tariff_side = 'forwarder_to_courier' then
        ts.courier_id = p_customer_id or ts.courier_id is null
      when p_tariff_side = 'courier_to_agency' then
        ts.courier_id = p_courier_id
        and (ts.agency_id = p_customer_id or ts.agency_id is null)
    end
    -- Modality: specific or catch-all
    and (ts.modality = p_modality or ts.modality is null)
    -- Category: specific or catch-all
    and (ts.shipping_category_id = p_category_id or ts.shipping_category_id is null)
  order by
    -- 1. Customer-specific before base
    case when p_tariff_side = 'forwarder_to_courier' then
      case when ts.courier_id is not null then 0 else 1 end
    else
      case when ts.agency_id is not null then 0 else 1 end
    end,
    -- 2. Modality-specific before catch-all
    case when ts.modality is not null then 0 else 1 end,
    -- 3. Category-specific before catch-all
    case when ts.shipping_category_id is not null then 0 else 1 end,
    -- 4. Most recent effective_from
    ts.effective_from desc
  limit 1;
end;
$$ language plpgsql stable;
