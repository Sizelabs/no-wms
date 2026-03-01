-- ============================================================================
-- Add company_admin role + make super_admin platform-level (cross-org)
-- ============================================================================

-- 1. Update user_roles CHECK constraint to include company_admin
alter table user_roles drop constraint if exists user_roles_role_check;
alter table user_roles add constraint user_roles_role_check check (role in (
  'super_admin', 'company_admin', 'warehouse_admin', 'warehouse_operator',
  'shipping_clerk', 'destination_admin', 'destination_operator', 'agency'
));

-- 2. Recreate RLS helper: auth_org_id() unchanged (still returns user's org)
-- No change needed — super_admin bypass is handled in policies, not here.

-- 3. Drop and recreate org-scoped policies to include super_admin bypass.
--    super_admin can see ALL orgs' data (platform-level).
--    company_admin sees only their own org (same as other non-super roles).

-- Helper: drop existing org policies on a table
create or replace function _drop_org_policies(tbl text)
returns void as $$
begin
  execute format('drop policy if exists "org_select" on %I', tbl);
  execute format('drop policy if exists "org_insert" on %I', tbl);
  execute format('drop policy if exists "org_update" on %I', tbl);
end;
$$ language plpgsql;

-- Helper: create org policies WITH super_admin bypass
create or replace function _create_org_policies_with_bypass(tbl text)
returns void as $$
begin
  execute format(
    'create policy "org_select" on %I for select using (organization_id = auth_org_id() or auth_has_role(''super_admin''))',
    tbl
  );
  execute format(
    'create policy "org_insert" on %I for insert with check (organization_id = auth_org_id() or auth_has_role(''super_admin''))',
    tbl
  );
  execute format(
    'create policy "org_update" on %I for update using (organization_id = auth_org_id() or auth_has_role(''super_admin''))',
    tbl
  );
end;
$$ language plpgsql;

-- Apply to all business tables with organization_id
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'warehouses', 'warehouse_zones', 'warehouse_locations',
    'destination_countries', 'courier_categories', 'agencies', 'agency_contacts',
    'consignees', 'warehouse_receipts', 'wr_photos', 'wr_status_history', 'wr_notes',
    'unknown_wrs', 'work_orders', 'work_order_status_history',
    'shipping_instructions', 'shipping_instruction_status_history',
    'mawbs', 'hawbs', 'mawb_status_history', 'sacas', 'cargo_releases',
    'airline_reservations', 'tariff_schedules',
    'invoices', 'storage_charges',
    'tickets', 'ticket_messages', 'ticket_status_history',
    'notification_templates', 'notifications', 'mass_notifications',
    'pickup_requests',
    'saved_searches', 'recent_searches',
    'wr_transfer_requests', 'sync_queue', 'audit_logs'
  ])
  loop
    perform _drop_org_policies(tbl);
    perform _create_org_policies_with_bypass(tbl);
  end loop;
end;
$$;

-- Also update profiles policy to include super_admin bypass
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- Update user_roles policy to include super_admin bypass
drop policy if exists "user_roles_select" on user_roles;
create policy "user_roles_select" on user_roles for select using (
  organization_id = auth_org_id() or auth_has_role('super_admin')
);

-- Update settings policy to include super_admin bypass
drop policy if exists "settings_select" on settings;
create policy "settings_select" on settings for select using (
  organization_id = auth_org_id()
  or (scope_type = 'platform' and organization_id is null)
  or auth_has_role('super_admin')
);

-- Update junction table policies to include super_admin bypass
-- work_order_items
drop policy if exists "org_select" on work_order_items;
drop policy if exists "org_insert" on work_order_items;
drop policy if exists "org_update" on work_order_items;
create policy "org_select" on work_order_items for select using (
  auth_has_role('super_admin') or
  exists (select 1 from work_orders wo where wo.id = work_order_id and wo.organization_id = auth_org_id())
);
create policy "org_insert" on work_order_items for insert with check (
  auth_has_role('super_admin') or
  exists (select 1 from work_orders wo where wo.id = work_order_id and wo.organization_id = auth_org_id())
);
create policy "org_update" on work_order_items for update using (
  auth_has_role('super_admin') or
  exists (select 1 from work_orders wo where wo.id = work_order_id and wo.organization_id = auth_org_id())
);

-- shipping_instruction_items
drop policy if exists "org_select" on shipping_instruction_items;
drop policy if exists "org_insert" on shipping_instruction_items;
drop policy if exists "org_update" on shipping_instruction_items;
create policy "org_select" on shipping_instruction_items for select using (
  auth_has_role('super_admin') or
  exists (select 1 from shipping_instructions si where si.id = shipping_instruction_id and si.organization_id = auth_org_id())
);
create policy "org_insert" on shipping_instruction_items for insert with check (
  auth_has_role('super_admin') or
  exists (select 1 from shipping_instructions si where si.id = shipping_instruction_id and si.organization_id = auth_org_id())
);
create policy "org_update" on shipping_instruction_items for update using (
  auth_has_role('super_admin') or
  exists (select 1 from shipping_instructions si where si.id = shipping_instruction_id and si.organization_id = auth_org_id())
);

-- saca_items
drop policy if exists "org_select" on saca_items;
drop policy if exists "org_insert" on saca_items;
drop policy if exists "org_update" on saca_items;
create policy "org_select" on saca_items for select using (
  auth_has_role('super_admin') or
  exists (select 1 from sacas s where s.id = saca_id and s.organization_id = auth_org_id())
);
create policy "org_insert" on saca_items for insert with check (
  auth_has_role('super_admin') or
  exists (select 1 from sacas s where s.id = saca_id and s.organization_id = auth_org_id())
);
create policy "org_update" on saca_items for update using (
  auth_has_role('super_admin') or
  exists (select 1 from sacas s where s.id = saca_id and s.organization_id = auth_org_id())
);

-- tariff_rates
drop policy if exists "org_select" on tariff_rates;
drop policy if exists "org_insert" on tariff_rates;
drop policy if exists "org_update" on tariff_rates;
create policy "org_select" on tariff_rates for select using (
  auth_has_role('super_admin') or
  exists (select 1 from tariff_schedules ts where ts.id = schedule_id and ts.organization_id = auth_org_id())
);
create policy "org_insert" on tariff_rates for insert with check (
  auth_has_role('super_admin') or
  exists (select 1 from tariff_schedules ts where ts.id = schedule_id and ts.organization_id = auth_org_id())
);
create policy "org_update" on tariff_rates for update using (
  auth_has_role('super_admin') or
  exists (select 1 from tariff_schedules ts where ts.id = schedule_id and ts.organization_id = auth_org_id())
);

-- invoice_line_items
drop policy if exists "org_select" on invoice_line_items;
drop policy if exists "org_insert" on invoice_line_items;
drop policy if exists "org_update" on invoice_line_items;
create policy "org_select" on invoice_line_items for select using (
  auth_has_role('super_admin') or
  exists (select 1 from invoices i where i.id = invoice_id and i.organization_id = auth_org_id())
);
create policy "org_insert" on invoice_line_items for insert with check (
  auth_has_role('super_admin') or
  exists (select 1 from invoices i where i.id = invoice_id and i.organization_id = auth_org_id())
);
create policy "org_update" on invoice_line_items for update using (
  auth_has_role('super_admin') or
  exists (select 1 from invoices i where i.id = invoice_id and i.organization_id = auth_org_id())
);

-- ticket_messages (child of tickets)
drop policy if exists "org_select" on ticket_messages;
drop policy if exists "org_insert" on ticket_messages;
drop policy if exists "org_update" on ticket_messages;
create policy "org_select" on ticket_messages for select using (
  auth_has_role('super_admin') or
  exists (select 1 from tickets t where t.id = ticket_id and t.organization_id = auth_org_id())
);
create policy "org_insert" on ticket_messages for insert with check (
  auth_has_role('super_admin') or
  exists (select 1 from tickets t where t.id = ticket_id and t.organization_id = auth_org_id())
);
create policy "org_update" on ticket_messages for update using (
  auth_has_role('super_admin') or
  exists (select 1 from tickets t where t.id = ticket_id and t.organization_id = auth_org_id())
);

-- pickup_request_wrs (child of pickup_requests)
drop policy if exists "org_select" on pickup_request_wrs;
drop policy if exists "org_insert" on pickup_request_wrs;
drop policy if exists "org_update" on pickup_request_wrs;
create policy "org_select" on pickup_request_wrs for select using (
  auth_has_role('super_admin') or
  exists (select 1 from pickup_requests pr where pr.id = pickup_request_id and pr.organization_id = auth_org_id())
);
create policy "org_insert" on pickup_request_wrs for insert with check (
  auth_has_role('super_admin') or
  exists (select 1 from pickup_requests pr where pr.id = pickup_request_id and pr.organization_id = auth_org_id())
);
create policy "org_update" on pickup_request_wrs for update using (
  auth_has_role('super_admin') or
  exists (select 1 from pickup_requests pr where pr.id = pickup_request_id and pr.organization_id = auth_org_id())
);

-- Agency-scoped policies: also add super_admin bypass
drop policy if exists "agency_wr_select" on warehouse_receipts;
create policy "agency_wr_select" on warehouse_receipts for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

drop policy if exists "agency_si_select" on shipping_instructions;
create policy "agency_si_select" on shipping_instructions for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

drop policy if exists "agency_wo_select" on work_orders;
create policy "agency_wo_select" on work_orders for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

drop policy if exists "agency_ticket_select" on tickets;
create policy "agency_ticket_select" on tickets for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

drop policy if exists "agency_invoice_select" on invoices;
create policy "agency_invoice_select" on invoices for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

-- Clean up helper functions (no longer needed)
drop function if exists _drop_org_policies(text);
drop function if exists _create_org_policies_with_bypass(text);
