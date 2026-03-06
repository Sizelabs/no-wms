-- Fix agency-scoped RLS policies: they were PERMISSIVE (OR'd with org_select),
-- which meant non-agency users bypassed org filtering entirely.
-- Change them to RESTRICTIVE (AND'd) so org_select is always enforced.

-- warehouse_receipts
drop policy if exists "agency_wr_select" on warehouse_receipts;
create policy "agency_wr_select" on warehouse_receipts as restrictive for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

-- shipping_instructions
drop policy if exists "agency_si_select" on shipping_instructions;
create policy "agency_si_select" on shipping_instructions as restrictive for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

-- work_orders
drop policy if exists "agency_wo_select" on work_orders;
create policy "agency_wo_select" on work_orders as restrictive for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

-- tickets
drop policy if exists "agency_ticket_select" on tickets;
create policy "agency_ticket_select" on tickets as restrictive for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);

-- invoices
drop policy if exists "agency_invoice_select" on invoices;
create policy "agency_invoice_select" on invoices as restrictive for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id = any(auth_agency_ids())
);
