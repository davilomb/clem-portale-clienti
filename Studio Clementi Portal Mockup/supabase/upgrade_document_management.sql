alter table public.documents
  add column if not exists folder_id text default '',
  add column if not exists category text default 'Altro',
  add column if not exists tags text default '',
  add column if not exists document_status text default 'Pubblicato',
  add column if not exists comment text default '',
  add column if not exists parent_document_id text default '',
  add column if not exists version_number integer default 1;

create table if not exists public.document_folders (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  name text not null,
  description text default ''
);

create table if not exists public.notifications (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  channel text not null default 'Email',
  recipient_email text not null,
  recipient_phone text default '',
  notification_type text not null,
  related_type text not null,
  related_id text not null,
  subject text not null,
  message text not null,
  status text not null default 'Da inviare',
  created_at text default '',
  sent_at text default ''
);

alter table public.notifications
  add column if not exists channel text not null default 'Email',
  add column if not exists recipient_phone text default '';

update public.documents
set
  category = case
    when lower(title) like '%planimetria%' then 'Planimetria'
    when lower(title) like '%preventivo%' then 'Preventivo'
    when lower(title) like '%relazione%' then 'Relazione tecnica'
    else coalesce(category, 'Altro')
  end,
  document_status = coalesce(document_status, 'Pubblicato'),
  parent_document_id = coalesce(parent_document_id, ''),
  version_number = coalesce(version_number, 1);
