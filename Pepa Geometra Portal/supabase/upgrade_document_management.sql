alter table public.documents
  add column if not exists category text default 'Altro',
  add column if not exists tags text default '',
  add column if not exists document_status text default 'Pubblicato',
  add column if not exists parent_document_id text default '',
  add column if not exists version_number integer default 1,
  add column if not exists source text default 'Studio',
  add column if not exists request_id text default '';

alter table public.projects
  add column if not exists work_amount numeric default 0,
  add column if not exists technical_fee numeric default 0,
  add column if not exists project_photos jsonb default '[]'::jsonb;

alter table public.timeline
  add column if not exists color text default '#2f6f6d',
  add column if not exists visibility text default 'Cliente';

alter table public.events
  add column if not exists color text default '#c78734',
  add column if not exists visibility text default 'Cliente';

alter table public.checklist
  add column if not exists notes text default '';

alter table public.requests
  add column if not exists upload_required boolean default false,
  add column if not exists requested_document_title text default '',
  add column if not exists uploaded_document_id text default '';

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
