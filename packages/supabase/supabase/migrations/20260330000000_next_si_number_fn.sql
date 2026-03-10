-- Generates the next SI number for an organization, bypassing RLS.
create or replace function next_si_number(p_org_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select 'SI' || lpad(
    (coalesce(
      max(nullif(regexp_replace(si_number, '[^0-9]', '', 'g'), '')::int),
      0
    ) + 1)::text,
    5, '0'
  )
  from shipping_instructions
  where organization_id = p_org_id;
$$;

-- Same pattern for HAWB numbers.
create or replace function next_hawb_number(p_org_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select 'GLP' || lpad(
    (coalesce(
      max(nullif(regexp_replace(hawb_number, '[^0-9]', '', 'g'), '')::int),
      0
    ) + 1)::text,
    5, '0'
  )
  from hawbs
  where organization_id = p_org_id;
$$;
