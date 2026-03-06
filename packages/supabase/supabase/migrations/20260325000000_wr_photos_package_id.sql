-- Link photos to individual packages instead of only to the WR.
alter table wr_photos
  add column package_id uuid references packages(id) on delete cascade;

create index idx_wr_photos_package on wr_photos(package_id);
