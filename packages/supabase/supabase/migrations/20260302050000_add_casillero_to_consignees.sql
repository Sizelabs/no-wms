-- ============================================================================
-- Add casillero (virtual mailbox) to consignees
-- Format: agency_code + 6-digit sequential number, e.g., AND000001
-- ============================================================================

-- 1. Add nullable column first
alter table consignees add column casillero text;

-- 2. Backfill existing rows using agency code + row number
update consignees
set casillero = sub.casillero
from (
  select
    c.id,
    a.code || lpad(row_number() over (partition by c.agency_id order by c.created_at)::text, 6, '0') as casillero
  from consignees c
  join agencies a on a.id = c.agency_id
) sub
where consignees.id = sub.id;

-- 3. Make NOT NULL now that all rows are backfilled
alter table consignees alter column casillero set not null;

-- 4. Unique constraint per agency
alter table consignees add constraint uq_consignees_agency_casillero unique (agency_id, casillero);

-- 5. Index for lookups by casillero
create index idx_consignees_casillero on consignees(casillero);
