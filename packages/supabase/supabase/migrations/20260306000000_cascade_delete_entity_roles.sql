-- ============================================================================
-- Migration: Add ON DELETE CASCADE to user_roles and agencies FK constraints
-- Ensures superadmins can delete couriers, warehouses, agencies, and
-- destinations without FK violations from orphaned user_roles rows.
-- ============================================================================

-- 1. user_roles.courier_id → couriers(id) ON DELETE CASCADE
alter table user_roles
  drop constraint user_roles_courrier_id_fkey;
alter table user_roles
  add constraint user_roles_courier_id_fkey
  foreign key (courier_id) references couriers(id) on delete cascade;

-- 2. user_roles.warehouse_id → warehouses(id) ON DELETE CASCADE
alter table user_roles
  drop constraint fk_user_roles_warehouse;
alter table user_roles
  add constraint user_roles_warehouse_id_fkey
  foreign key (warehouse_id) references warehouses(id) on delete cascade;

-- 3. user_roles.agency_id → agencies(id) ON DELETE CASCADE
alter table user_roles
  drop constraint fk_user_roles_agency;
alter table user_roles
  add constraint user_roles_agency_id_fkey
  foreign key (agency_id) references agencies(id) on delete cascade;

-- 4. user_roles.destination_id → destinations(id) ON DELETE CASCADE
alter table user_roles
  drop constraint user_roles_destination_id_fkey;
alter table user_roles
  add constraint user_roles_destination_id_fkey
  foreign key (destination_id) references destinations(id) on delete cascade;

-- 5. agencies.courier_id → couriers(id) ON DELETE CASCADE
alter table agencies
  drop constraint agencies_courrier_id_fkey;
alter table agencies
  add constraint agencies_courier_id_fkey
  foreign key (courier_id) references couriers(id) on delete cascade;
