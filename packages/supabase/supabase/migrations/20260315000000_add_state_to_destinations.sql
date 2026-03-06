-- Add state column to destinations
alter table destinations add column state text;

-- Update unique constraint to include state
alter table destinations drop constraint destinations_organization_id_city_country_code_key;
alter table destinations add constraint destinations_org_city_state_country_key
  unique(organization_id, city, state, country_code);
