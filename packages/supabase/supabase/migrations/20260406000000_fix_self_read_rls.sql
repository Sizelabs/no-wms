-- Fix: users must always be able to read their own profile and role assignments.
-- Previously the policies relied on org matching or auth_has_role('super_admin'),
-- which fails for super_admin (NULL org) if the user_roles row is missing or
-- if the auth_has_role lookup errors.
--
-- Adding `user_id = auth.uid()` / `id = auth.uid()` as a first-class condition
-- ensures any authenticated user can always read their own rows.

-- 1. user_roles: let users always read their own role entries
drop policy if exists "user_roles_select" on user_roles;
create policy "user_roles_select" on user_roles for select using (
  user_id = auth.uid()
  or organization_id = auth_org_id()
  or auth_has_role('super_admin')
);

-- 2. profiles: let users always read their own profile
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select using (
  id = auth.uid()
  or organization_id = auth_org_id()
  or auth_has_role('super_admin')
);
