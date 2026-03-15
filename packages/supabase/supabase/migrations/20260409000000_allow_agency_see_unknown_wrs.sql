-- ============================================================================
-- Migration: Allow agency users to see unknown warehouse receipts
-- Bug: The restrictive agency_wr_select policy blocks agencies from seeing
-- WRs where agency_id IS NULL (i.e., unknown/unclaimed WRs).
-- Fix: Add exception for rows with NULL agency_id so agencies can view and
-- claim unknown WRs through the /unknown-wrs page.
-- ============================================================================

DROP POLICY IF EXISTS "agency_wr_select" ON warehouse_receipts;

CREATE POLICY "agency_wr_select" ON warehouse_receipts AS RESTRICTIVE FOR SELECT USING (
  auth_has_role('super_admin')
  OR NOT auth_has_role('agency')
  OR agency_id = ANY(auth_agency_ids())
  OR agency_id IS NULL
);

NOTIFY pgrst, 'reload schema';
