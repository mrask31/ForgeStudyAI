-- Add optional parent PIN for account-level protection
alter table profiles
  add column if not exists parent_pin_hash text,
  add column if not exists parent_pin_salt text;

-- Add optional student PIN for sibling protection
alter table student_profiles
  add column if not exists pin_hash text,
  add column if not exists pin_salt text;
