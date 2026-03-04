-- Add ticket_attachments table and storage bucket for claim evidence

-- ── Table ──
create table ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  ticket_id uuid not null references tickets(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_ticket_attachments_ticket on ticket_attachments(ticket_id);

-- ── RLS ──
alter table ticket_attachments enable row level security;

create policy "org_select" on ticket_attachments for select using (
  exists (select 1 from tickets t where t.id = ticket_id and t.organization_id = auth_org_id())
);
create policy "org_insert" on ticket_attachments for insert with check (
  exists (select 1 from tickets t where t.id = ticket_id and t.organization_id = auth_org_id())
);

-- ── Storage bucket ──
insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

-- Storage policies: authenticated users in same org can upload/read
create policy "auth_upload" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ticket-attachments');

create policy "auth_read" on storage.objects for select
  to authenticated
  using (bucket_id = 'ticket-attachments');

create policy "auth_delete" on storage.objects for delete
  to authenticated
  using (bucket_id = 'ticket-attachments');
