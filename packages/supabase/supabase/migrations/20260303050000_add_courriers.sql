-- ============================================================
-- Migration: Add courriers entity + courrier scoping
-- ============================================================

-- 1. courriers table
create table courriers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  code text not null,
  type text not null default 'corporativo' check (type in ('corporativo', 'box')),
  ruc text,
  address text,
  city text,
  country text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, code)
);

-- 2. courrier_coverage table
create table courrier_coverage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  courrier_id uuid not null references courriers(id) on delete cascade,
  destination_country_id uuid not null references destination_countries(id),
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(courrier_id, destination_country_id, city)
);

-- 3. Alter agencies: add courrier_id FK
alter table agencies add column courrier_id uuid references courriers(id);
create index idx_agencies_courrier on agencies(courrier_id);

-- 4. Alter user_roles: add courrier_id FK
alter table user_roles add column courrier_id uuid references courriers(id);

-- 5. updated_at trigger on courriers
create trigger set_courriers_updated_at
  before update on courriers
  for each row execute function update_updated_at();

-- 6. Audit trigger on courriers
create trigger audit_courriers
  after insert or update or delete on courriers
  for each row execute function audit_trigger_fn();

-- 7. updated_at trigger on courrier_coverage (using created_at only, no updated_at)
-- courrier_coverage has no updated_at, so no trigger needed

-- 8. Auth helper: returns courrier IDs for destination-role users
create or replace function auth_courrier_ids() returns uuid[]
language sql stable security definer as $$
  select coalesce(
    array_agg(courrier_id) filter (where courrier_id is not null),
    '{}'::uuid[]
  )
  from user_roles
  where user_id = auth.uid()
    and role in ('destination_admin', 'destination_operator')
    and courrier_id is not null;
$$;

-- 9. RLS on courriers (org-scoped + super_admin bypass)
alter table courriers enable row level security;

create policy courriers_select on courriers for select using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy courriers_insert on courriers for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy courriers_update on courriers for update using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy courriers_delete on courriers for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- 10. RLS on courrier_coverage (org-scoped + super_admin bypass)
alter table courrier_coverage enable row level security;

create policy courrier_coverage_select on courrier_coverage for select using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy courrier_coverage_insert on courrier_coverage for insert with check (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy courrier_coverage_update on courrier_coverage for update using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);
create policy courrier_coverage_delete on courrier_coverage for delete using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- 11. Courrier-scoped policies on agencies for destination roles
-- Destination roles should only see agencies under their assigned courrier(s)
create policy agency_courrier_select on agencies for select using (
  auth_has_role('super_admin')
  or not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
  or courrier_id = any(auth_courrier_ids())
);
