-- Allow superadmin (and future platform-level users) to exist without an organization.
-- RLS already bypasses org checks for super_admin via auth_has_role('super_admin').

-- 1. Make organization_id nullable on profiles
alter table profiles alter column organization_id drop not null;

-- 2. Make organization_id nullable on user_roles
alter table user_roles alter column organization_id drop not null;

-- 3. Set the seed superadmin (b000...001) to have no org
update profiles
  set organization_id = null
where id = 'b0000000-0000-0000-0000-000000000001';

update user_roles
  set organization_id = null
where user_id = 'b0000000-0000-0000-0000-000000000001'
  and role = 'super_admin';

-- 4. Also update the real superadmin if it exists (from migration 20260301032001)
update profiles
  set organization_id = null
where id = 'd1c4f217-5d0e-4e00-8e3a-60f11712bd78';

update user_roles
  set organization_id = null
where user_id = 'd1c4f217-5d0e-4e00-8e3a-60f11712bd78'
  and role = 'super_admin';
