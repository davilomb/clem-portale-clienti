alter table public.documents
  add column if not exists folder_id text default '',
  add column if not exists category text default 'Altro',
  add column if not exists tags text default '',
  add column if not exists document_status text default 'Pubblicato',
  add column if not exists comment text default '',
  add column if not exists parent_document_id text default '',
  add column if not exists version_number integer default 1,
  add column if not exists source text default 'Studio',
  add column if not exists request_id text default '',
  add column if not exists storage_key text default '',
  add column if not exists file_name text default '',
  add column if not exists mime_type text default '',
  add column if not exists file_size integer default 0;

alter table public.documents
  drop constraint if exists documents_visibility_check;

alter table public.documents
  add constraint documents_visibility_check
  check (visibility in ('Cliente', 'Interno', 'Studio'));

create table if not exists public.document_folders (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  name text not null,
  description text default ''
);

insert into public.document_folders (id, project_id, name, description) values
  ('folder-planimetrie-bianchi', 'villa-bianchi', 'Planimetrie', 'Elaborati grafici e tavole'),
  ('folder-pratiche-comunali-bianchi', 'villa-bianchi', 'Pratiche comunali', 'Comunicazioni, protocolli e autorizzazioni'),
  ('folder-antincendio-bianchi', 'villa-bianchi', 'Pratiche antincendio', 'Documenti Vigili del Fuoco e sicurezza'),
  ('folder-foto-bianchi', 'villa-bianchi', 'Foto sopralluogo', 'Immagini e rilievi fotografici'),
  ('folder-vuota-bianchi', 'villa-bianchi', 'Collaudi e certificazioni', 'Cartella pronta per documenti futuri'),
  ('folder-generale-verdi', 'negozio-verdi', 'Documentazione generale', 'Materiale condiviso con il cliente'),
  ('folder-consegna-neri', 'studio-neri', 'Consegna finale', 'Documenti conclusivi')
on conflict (id) do nothing;

create table if not exists public.notifications (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
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
  alter column project_id drop not null;

create table if not exists public.app_settings (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at text default ''
);

insert into public.app_settings (id, value, updated_at) values
  (
    'notifications',
    '{
      "emailEnabled": true,
      "messageEnabled": false,
      "defaultEmail": true,
      "defaultMessage": false,
      "emailProvider": "Brevo",
      "messageProvider": "WhatsApp Cloud API",
      "emailFromName": "InBolla",
      "emailFrom": "inbolla.web@gmail.com",
      "replyToEmail": "inbolla.web@gmail.com",
      "whatsappSender": "InBolla",
      "whatsappPhone": "",
      "whatsappBusinessAccountId": "",
      "whatsappStatus": "Futura integrazione"
    }'::jsonb,
    'Da configurare'
  )
on conflict (id) do nothing;

update public.documents
set
  folder_id = coalesce(folder_id, ''),
  category = coalesce(category, 'Altro'),
  document_status = coalesce(document_status, 'Pubblicato'),
  comment = coalesce(comment, ''),
  parent_document_id = coalesce(parent_document_id, ''),
  version_number = coalesce(version_number, 1),
  source = coalesce(source, 'Studio'),
  request_id = coalesce(request_id, ''),
  storage_key = coalesce(storage_key, ''),
  file_name = coalesce(file_name, ''),
  mime_type = coalesce(mime_type, ''),
  file_size = coalesce(file_size, 0);

notify pgrst, 'reload schema';
