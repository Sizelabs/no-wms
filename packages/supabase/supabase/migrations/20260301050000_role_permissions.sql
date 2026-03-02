-- Role permissions table: stores configurable CRUD permissions per role per resource.
-- Global (not per-org). Only super_admin can read/write.

create table role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  resource text not null,
  can_create boolean not null default false,
  can_read boolean not null default false,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(role, resource)
);

-- RLS: only super_admin can access
alter table role_permissions enable row level security;

create policy "super_admin can read role_permissions"
  on role_permissions for select
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'super_admin'
    )
  );

create policy "super_admin can insert role_permissions"
  on role_permissions for insert
  with check (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'super_admin'
    )
  );

create policy "super_admin can update role_permissions"
  on role_permissions for update
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'super_admin'
    )
  );

create policy "super_admin can delete role_permissions"
  on role_permissions for delete
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'super_admin'
    )
  );

-- Auto-update updated_at
create trigger set_role_permissions_updated_at
  before update on role_permissions
  for each row
  execute function update_updated_at();
