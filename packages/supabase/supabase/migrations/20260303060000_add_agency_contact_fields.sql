-- Add contact fields to agencies table
alter table agencies
  add column ruc text,
  add column address text,
  add column phone text,
  add column email text;
