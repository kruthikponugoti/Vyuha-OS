-- Staff-account management: deactivation + forced first-login password change.
-- Run once in the Supabase SQL editor. Additive and idempotent.

alter table users
  add column if not exists active boolean not null default true,
  add column if not exists must_change_password boolean not null default false;
