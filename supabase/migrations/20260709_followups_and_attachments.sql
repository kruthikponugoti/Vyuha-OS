-- CRM follow-ups and project task attachments.
-- Additive, safe to run on an existing database.

alter table leads
  add column if not exists follow_up_date date;

alter table tasks
  add column if not exists attachments jsonb not null default '[]';
