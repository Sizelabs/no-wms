-- Efficient cross-table search for warehouse receipts.
-- Searches: wr_number, notes, consignee_name (WR), consignees.full_name,
-- consignees.casillero, packages.tracking_number, packages.carrier, packages.sender_name.
-- Respects RLS via auth_org_id().

create or replace function search_warehouse_receipts(
  p_search text,
  p_status text[] default null,
  p_agency_ids uuid[] default null,
  p_warehouse_ids uuid[] default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  total_count bigint
)
language sql stable security definer
as $$
  with matched as (
    select distinct wr.id, wr.received_at
    from warehouse_receipts wr
    left join consignees c on c.id = wr.consignee_id
    left join packages p on p.warehouse_receipt_id = wr.id
    where wr.organization_id = auth_org_id()
      -- text search across all relevant fields
      and (
        wr.wr_number ilike '%' || p_search || '%'
        or wr.notes ilike '%' || p_search || '%'
        or wr.consignee_name ilike '%' || p_search || '%'
        or c.full_name ilike '%' || p_search || '%'
        or c.casillero ilike '%' || p_search || '%'
        or p.tracking_number ilike '%' || p_search || '%'
        or p.carrier ilike '%' || p_search || '%'
        or p.sender_name ilike '%' || p_search || '%'
      )
      -- optional filters
      and (p_status is null or wr.status = any(p_status))
      and (p_agency_ids is null or wr.agency_id = any(p_agency_ids))
      and (p_warehouse_ids is null or wr.warehouse_id = any(p_warehouse_ids))
      and (p_date_from is null or wr.received_at >= p_date_from)
      and (p_date_to is null or wr.received_at <= p_date_to)
  )
  select m.id, (select count(*) from matched) as total_count
  from matched m
  order by m.received_at desc
  limit p_limit
  offset p_offset;
$$;
