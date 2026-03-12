-- Generates the next WO number for an organization, bypassing RLS.
-- Uses advisory lock to prevent race conditions on concurrent inserts.
create or replace function next_wo_number(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num int;
begin
  perform pg_advisory_xact_lock(hashtext('wo_number_' || p_org_id::text));
  select coalesce(
    max(nullif(regexp_replace(wo_number, '[^0-9]', '', 'g'), '')::int),
    0
  ) + 1 into next_num
  from work_orders
  where organization_id = p_org_id;
  return 'WO' || lpad(next_num::text, 5, '0');
end;
$$;
