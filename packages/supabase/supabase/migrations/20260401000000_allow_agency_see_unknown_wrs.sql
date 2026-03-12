-- Allow agency users to see unknown (unassigned) warehouse receipts.
-- Previously, the restrictive policy required agency_id = any(auth_agency_ids()),
-- which excluded rows where agency_id IS NULL (unknown WRs).

drop policy if exists "agency_wr_select" on warehouse_receipts;
create policy "agency_wr_select" on warehouse_receipts as restrictive for select using (
  auth_has_role('super_admin')
  or not auth_has_role('agency')
  or agency_id is null
  or agency_id = any(auth_agency_ids())
);
