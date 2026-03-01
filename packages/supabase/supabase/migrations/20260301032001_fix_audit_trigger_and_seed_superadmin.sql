-- Fix audit_trigger_fn: organizations table has 'id' as the org id, not 'organization_id'
create or replace function audit_trigger_fn()
returns trigger as $$
declare
  v_org_id uuid;
begin
  if tg_table_name = 'organizations' then
    v_org_id := coalesce(new.id, old.id);
  else
    v_org_id := coalesce(new.organization_id, old.organization_id);
  end if;

  insert into audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    v_org_id,
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

-- Seed default organization and superadmin
insert into organizations (name, slug)
values ('No-WMS', 'no-wms')
on conflict (slug) do nothing;

do $$
declare
  v_org_id uuid;
begin
  select id into v_org_id from organizations where slug = 'no-wms';

  insert into profiles (id, organization_id, full_name, locale, timezone)
  values ('d1c4f217-5d0e-4e00-8e3a-60f11712bd78', v_org_id, 'Juan Acevedo', 'es', 'America/Guayaquil')
  on conflict (id) do nothing;

  insert into user_roles (user_id, organization_id, role)
  values ('d1c4f217-5d0e-4e00-8e3a-60f11712bd78', v_org_id, 'super_admin');
end;
$$;
