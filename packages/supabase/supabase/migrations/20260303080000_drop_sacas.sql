-- Remove sacas concept from the platform
-- Drop saca_items first (depends on sacas)
drop trigger if exists audit_saca_items on saca_items;
drop policy if exists "org_select" on saca_items;
drop policy if exists "org_insert" on saca_items;
drop policy if exists "org_update" on saca_items;
drop table saca_items;

-- Drop sacas
drop trigger if exists audit_sacas on sacas;
drop trigger if exists set_updated_at on sacas;
drop policy if exists "org_iso" on sacas;
drop table sacas;
