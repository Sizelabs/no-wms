-- Skip audit logging when deleting an organization itself,
-- since the cascade will also delete all its audit_logs.
create or replace function audit_trigger_fn()
returns trigger as $$
declare
  v_org_id uuid;
begin
  -- When deleting an organization, skip audit: the org (and its logs) are being removed
  if tg_table_name = 'organizations' and tg_op = 'DELETE' then
    return old;
  end if;

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
