alter table packages
  add column package_type text
  check (package_type is null or package_type in (
    'Box', 'Envelope', 'Tube', 'Pallet', 'Bag', 'Barrel', 'Crate', 'Other'
  ));
