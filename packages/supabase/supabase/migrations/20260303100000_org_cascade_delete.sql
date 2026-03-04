-- Add ON DELETE CASCADE to all foreign keys referencing organizations(id)
-- so that deleting an organization cascades to all dependent records.

do $$
declare
  r record;
begin
  for r in
    select
      tc.constraint_name,
      tc.table_schema,
      tc.table_name,
      kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_name = 'organizations'
      and ccu.column_name = 'id'
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      r.table_schema, r.table_name, r.constraint_name
    );
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references organizations(id) on delete cascade',
      r.table_schema, r.table_name, r.constraint_name, r.column_name
    );
  end loop;
end$$;
