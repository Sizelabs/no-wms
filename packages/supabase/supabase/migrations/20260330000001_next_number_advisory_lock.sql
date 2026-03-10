-- Add advisory locks to prevent race conditions on concurrent number generation.
create or replace function next_si_number(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num int;
begin
  perform pg_advisory_xact_lock(hashtext('si_number_' || p_org_id::text));
  select coalesce(
    max(nullif(regexp_replace(si_number, '[^0-9]', '', 'g'), '')::int),
    0
  ) + 1 into next_num
  from shipping_instructions
  where organization_id = p_org_id;
  return 'SI' || lpad(next_num::text, 5, '0');
end;
$$;

create or replace function next_hawb_number(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num int;
begin
  perform pg_advisory_xact_lock(hashtext('hawb_number_' || p_org_id::text));
  select coalesce(
    max(nullif(regexp_replace(hawb_number, '[^0-9]', '', 'g'), '')::int),
    0
  ) + 1 into next_num
  from hawbs
  where organization_id = p_org_id;
  return 'GLP' || lpad(next_num::text, 5, '0');
end;
$$;
