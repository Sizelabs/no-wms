-- Storage buckets for warehouse receipt photos and attachments

-- ── wr-photos bucket ──
insert into storage.buckets (id, name, public)
values ('wr-photos', 'wr-photos', false)
on conflict (id) do nothing;

create policy "wr_photos_upload" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'wr-photos');

create policy "wr_photos_read" on storage.objects for select
  to authenticated
  using (bucket_id = 'wr-photos');

create policy "wr_photos_delete" on storage.objects for delete
  to authenticated
  using (bucket_id = 'wr-photos');

-- ── wr-attachments bucket ──
insert into storage.buckets (id, name, public)
values ('wr-attachments', 'wr-attachments', false)
on conflict (id) do nothing;

create policy "wr_attachments_upload" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'wr-attachments');

create policy "wr_attachments_read" on storage.objects for select
  to authenticated
  using (bucket_id = 'wr-attachments');

create policy "wr_attachments_delete" on storage.objects for delete
  to authenticated
  using (bucket_id = 'wr-attachments');
