-- ============================================================================
-- WR → Packages, HAWB → WRs restructure
-- Hierarchy: MAWB → 1+ HAWBs → 1+ WRs → 1+ Packages
-- ============================================================================

-- ============================================================================
-- 1a. Create packages table
-- ============================================================================

create table packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_receipt_id uuid not null references warehouse_receipts(id) on delete cascade,
  -- Physical
  tracking_number text not null,
  carrier text,
  actual_weight_lb numeric(10,2),
  length_in numeric(10,2),
  width_in numeric(10,2),
  height_in numeric(10,2),
  volumetric_weight_lb numeric(10,2),
  billable_weight_lb numeric(10,2),
  -- Content
  content_description text,
  declared_value_usd numeric(12,2),
  sender_name text,
  pieces_count integer not null default 1,
  -- DGR
  is_dgr boolean not null default false,
  dgr_class text,
  -- Damage
  is_damaged boolean not null default false,
  damage_description text,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Constraints
  unique(organization_id, tracking_number)
);

-- Indexes
create index idx_packages_wr on packages(warehouse_receipt_id);
create index idx_packages_org on packages(organization_id);
create index idx_packages_tracking_trgm on packages using gin (tracking_number gin_trgm_ops);
create index idx_packages_fts on packages using gin (
  to_tsvector('spanish',
    coalesce(tracking_number, '') || ' ' ||
    coalesce(content_description, '') || ' ' ||
    coalesce(sender_name, '')
  )
);

-- ============================================================================
-- 1b. Migrate data from warehouse_receipts → packages
-- ============================================================================

insert into packages (
  organization_id, warehouse_receipt_id,
  tracking_number, carrier, actual_weight_lb,
  length_in, width_in, height_in,
  volumetric_weight_lb, billable_weight_lb,
  content_description, declared_value_usd, sender_name, pieces_count,
  is_dgr, dgr_class, is_damaged, damage_description,
  created_at, updated_at
)
select
  organization_id, id,
  tracking_number, carrier, actual_weight_lb,
  length_in, width_in, height_in,
  volumetric_weight_lb, billable_weight_lb,
  content_description, declared_value_usd, sender_name, pieces_count,
  is_dgr, dgr_class, is_damaged, damage_description,
  created_at, updated_at
from warehouse_receipts;

-- ============================================================================
-- 1c. Add aggregate columns to warehouse_receipts
-- ============================================================================

alter table warehouse_receipts
  add column total_actual_weight_lb numeric(10,2),
  add column total_volumetric_weight_lb numeric(10,2),
  add column total_billable_weight_lb numeric(10,2),
  add column total_declared_value_usd numeric(12,2),
  add column total_pieces integer,
  add column total_packages integer,
  add column has_damaged_package boolean not null default false,
  add column has_dgr_package boolean not null default false;

-- Populate aggregates from packages data
update warehouse_receipts wr set
  total_actual_weight_lb = agg.total_actual,
  total_volumetric_weight_lb = agg.total_volumetric,
  total_billable_weight_lb = agg.total_billable,
  total_declared_value_usd = agg.total_declared,
  total_pieces = agg.total_pieces,
  total_packages = agg.total_packages,
  has_damaged_package = agg.has_damaged,
  has_dgr_package = agg.has_dgr
from (
  select
    warehouse_receipt_id,
    coalesce(sum(actual_weight_lb), 0) as total_actual,
    coalesce(sum(volumetric_weight_lb), 0) as total_volumetric,
    coalesce(sum(billable_weight_lb), 0) as total_billable,
    coalesce(sum(declared_value_usd), 0) as total_declared,
    coalesce(sum(pieces_count), 0) as total_pieces,
    count(*) as total_packages,
    bool_or(is_damaged) as has_damaged,
    bool_or(is_dgr) as has_dgr
  from packages
  group by warehouse_receipt_id
) agg
where wr.id = agg.warehouse_receipt_id;

-- ============================================================================
-- 1d. Trigger: update_wr_package_aggregates()
-- ============================================================================

create or replace function update_wr_package_aggregates()
returns trigger as $$
declare
  v_wr_id uuid;
begin
  -- Determine which WR to update
  if tg_op = 'DELETE' then
    v_wr_id := old.warehouse_receipt_id;
  else
    v_wr_id := new.warehouse_receipt_id;
  end if;

  update warehouse_receipts set
    total_actual_weight_lb = coalesce(sub.total_actual, 0),
    total_volumetric_weight_lb = coalesce(sub.total_volumetric, 0),
    total_billable_weight_lb = coalesce(sub.total_billable, 0),
    total_declared_value_usd = coalesce(sub.total_declared, 0),
    total_pieces = coalesce(sub.total_pieces, 0),
    total_packages = coalesce(sub.total_packages, 0),
    has_damaged_package = coalesce(sub.has_damaged, false),
    has_dgr_package = coalesce(sub.has_dgr, false)
  from (
    select
      coalesce(sum(actual_weight_lb), 0) as total_actual,
      coalesce(sum(volumetric_weight_lb), 0) as total_volumetric,
      coalesce(sum(billable_weight_lb), 0) as total_billable,
      coalesce(sum(declared_value_usd), 0) as total_declared,
      coalesce(sum(pieces_count), 0) as total_pieces,
      count(*) as total_packages,
      bool_or(is_damaged) as has_damaged,
      bool_or(is_dgr) as has_dgr
    from packages
    where warehouse_receipt_id = v_wr_id
  ) sub
  where id = v_wr_id;

  -- If WR was changed (UPDATE moved package to different WR), update old WR too
  if tg_op = 'UPDATE' and old.warehouse_receipt_id != new.warehouse_receipt_id then
    update warehouse_receipts set
      total_actual_weight_lb = coalesce(sub2.total_actual, 0),
      total_volumetric_weight_lb = coalesce(sub2.total_volumetric, 0),
      total_billable_weight_lb = coalesce(sub2.total_billable, 0),
      total_declared_value_usd = coalesce(sub2.total_declared, 0),
      total_pieces = coalesce(sub2.total_pieces, 0),
      total_packages = coalesce(sub2.total_packages, 0),
      has_damaged_package = coalesce(sub2.has_damaged, false),
      has_dgr_package = coalesce(sub2.has_dgr, false)
    from (
      select
        coalesce(sum(actual_weight_lb), 0) as total_actual,
        coalesce(sum(volumetric_weight_lb), 0) as total_volumetric,
        coalesce(sum(billable_weight_lb), 0) as total_billable,
        coalesce(sum(declared_value_usd), 0) as total_declared,
        coalesce(sum(pieces_count), 0) as total_pieces,
        count(*) as total_packages,
        bool_or(is_damaged) as has_damaged,
        bool_or(is_dgr) as has_dgr
      from packages
      where warehouse_receipt_id = old.warehouse_receipt_id
    ) sub2
    where id = old.warehouse_receipt_id;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger update_wr_aggregates
  after insert or update or delete on packages
  for each row execute function update_wr_package_aggregates();

-- ============================================================================
-- 1e. Add hawb_id FK on warehouse_receipts
-- ============================================================================

alter table warehouse_receipts add column hawb_id uuid references hawbs(id);
create index idx_wr_hawb on warehouse_receipts(hawb_id);

-- ============================================================================
-- 1f. Make hawbs.shipping_instruction_id nullable
-- ============================================================================

alter table hawbs alter column shipping_instruction_id drop not null;

-- ============================================================================
-- 1g. Backfill hawb_id on WRs from existing HAWB→SI→SI_items→WR chain
-- ============================================================================

update warehouse_receipts wr set hawb_id = h.id
from hawbs h
join shipping_instruction_items si_item
  on si_item.shipping_instruction_id = h.shipping_instruction_id
where si_item.warehouse_receipt_id = wr.id
  and wr.hawb_id is null;

-- ============================================================================
-- 1h. Drop unique constraint on warehouse_receipts(organization_id, tracking_number)
-- ============================================================================

alter table warehouse_receipts
  drop constraint warehouse_receipts_organization_id_tracking_number_key;

-- ============================================================================
-- 1i. RLS policies for packages
-- ============================================================================

alter table packages enable row level security;

create policy "org_select" on packages
  for select using (organization_id = auth_org_id() or auth_has_role('super_admin'));

create policy "org_insert" on packages
  for insert with check (organization_id = auth_org_id() or auth_has_role('super_admin'));

create policy "org_update" on packages
  for update using (organization_id = auth_org_id() or auth_has_role('super_admin'));

create policy "org_delete" on packages
  for delete using (organization_id = auth_org_id() or auth_has_role('super_admin'));

-- ============================================================================
-- 1j. Update FTS index on warehouse_receipts
-- ============================================================================

drop index if exists idx_wr_fts;

create index idx_wr_fts on warehouse_receipts using gin (
  to_tsvector('spanish',
    coalesce(wr_number, '') || ' ' ||
    coalesce(notes, '')
  )
);

-- ============================================================================
-- 1k. Triggers for packages
-- ============================================================================

-- Audit trigger
create trigger audit_packages
  after insert or update or delete on packages
  for each row execute function audit_trigger_fn();

-- updated_at trigger
create trigger set_updated_at
  before update on packages
  for each row execute function update_updated_at();

-- ============================================================================
-- 1l. Drop deprecated columns from warehouse_receipts
-- ============================================================================

-- Drop trigram index on tracking_number (now on packages)
drop index if exists idx_wr_tracking_trgm;

alter table warehouse_receipts
  drop column tracking_number,
  drop column carrier,
  drop column actual_weight_lb,
  drop column length_in,
  drop column width_in,
  drop column height_in,
  drop column volumetric_weight_lb,
  drop column billable_weight_lb,
  drop column content_description,
  drop column declared_value_usd,
  drop column is_dgr,
  drop column dgr_class,
  drop column dgr_checklist_completed,
  drop column is_damaged,
  drop column damage_description,
  drop column sender_name,
  drop column pieces_count;
