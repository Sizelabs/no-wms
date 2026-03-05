-- Fix agencies RLS: the destinations migration (20260305000000) dropped and recreated
-- the org_select policy WITHOUT the auth_has_role('super_admin') bypass.
-- Also ensure the real superadmin always has a user_roles entry.

-- 1. Fix agencies select policy to include super_admin bypass
drop policy if exists "org_select" on agencies;
create policy "org_select" on agencies for select using (
  auth_has_role('super_admin')
  or (
    organization_id = auth_org_id()
    and (
      not (auth_has_role('destination_admin') or auth_has_role('destination_operator'))
      or courier_id = any(auth_courier_ids())
    )
  )
);

-- 2. Ensure real superadmin (d1c4f217-...) has profile + user_roles if the auth user exists.
--    This is needed because the original migration (20260301032001) only seeds conditionally,
--    and a db reset may run migrations before the auth user is recreated.
do $$
declare
  v_user_exists boolean;
begin
  select exists(
    select 1 from auth.users where id = 'd1c4f217-5d0e-4e00-8e3a-60f11712bd78'
  ) into v_user_exists;

  if v_user_exists then
    insert into profiles (id, organization_id, full_name, locale, timezone)
    values ('d1c4f217-5d0e-4e00-8e3a-60f11712bd78', null, 'Juan Acevedo', 'es', 'America/Guayaquil')
    on conflict (id) do update set organization_id = null;

    -- Use WHERE NOT EXISTS since the unique constraint includes nullable columns
    insert into user_roles (user_id, organization_id, role)
    select 'd1c4f217-5d0e-4e00-8e3a-60f11712bd78', null, 'super_admin'
    where not exists (
      select 1 from user_roles
      where user_id = 'd1c4f217-5d0e-4e00-8e3a-60f11712bd78'
        and role = 'super_admin'
    );
  end if;
end;
$$;
