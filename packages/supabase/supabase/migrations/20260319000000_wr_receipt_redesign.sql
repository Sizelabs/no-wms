-- Receipt redesign: add WR-level fields and per-package notes

-- New WR-level fields
alter table warehouse_receipts
  add column if not exists shipper_name text,
  add column if not exists master_tracking text,
  add column if not exists description text;

-- Per-package notes
alter table packages
  add column if not exists notes text;

-- Organization WR prefix for WR number generation (e.g., "GLP")
alter table organizations
  add column if not exists wr_prefix text;

-- WR attachments (documents, PDFs - separate from package photos)
create table if not exists wr_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  warehouse_receipt_id uuid not null references warehouse_receipts(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size integer,
  created_at timestamptz not null default now()
);

alter table wr_attachments enable row level security;

create policy "wr_attachments_org_access" on wr_attachments
  for all using (organization_id = auth_org_id());
