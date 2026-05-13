create table if not exists public.users (
  id text primary key,
  username text unique not null,
  password text not null,
  name text not null,
  role text not null check (role in ('Geometra', 'Cliente')),
  email text not null,
  client_id text
);

create table if not exists public.clients (
  id text primary key,
  name text not null,
  email text not null,
  phone text default ''
);

create table if not exists public.projects (
  id text primary key,
  client_id text not null references public.clients(id) on delete cascade,
  title text not null,
  client text not null,
  address text default '',
  status text not null default 'In corso',
  phase text default '',
  updated_at text default '',
  description text default '',
  progress integer default 0,
  work_amount numeric default 0,
  technical_fee numeric default 0,
  project_photos jsonb default '[]'::jsonb,
  next_action text default '',
  next_action_owner text default 'Studio',
  next_action_due text default 'Da definire'
);

create table if not exists public.documents (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  type text default 'PDF',
  version text default 'v1.0',
  date text default '',
  visibility text not null default 'Cliente' check (visibility in ('Cliente', 'Interno')),
  category text default 'Altro',
  tags text default '',
  document_status text default 'Pubblicato',
  parent_document_id text default '',
  version_number integer default 1,
  source text default 'Studio',
  request_id text default '',
  storage_key text default '',
  file_name text default '',
  mime_type text default '',
  file_size integer default 0
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

create table if not exists public.timeline (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  date text default '',
  title text not null,
  body text not null,
  color text default '#2f6f6d',
  visibility text default 'Cliente'
);

create table if not exists public.events (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  day text not null,
  month text not null,
  title text not null,
  note text default '',
  color text default '#c78734',
  visibility text default 'Cliente'
);

create table if not exists public.checklist (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  label text not null,
  status text not null default 'Da fare',
  notes text default ''
);

create table if not exists public.requests (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'Aperta',
  due_date text default 'Da definire',
  upload_required boolean default false,
  requested_document_title text default '',
  uploaded_document_id text default ''
);

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

insert into public.clients (id, name, email, phone) values
  ('cliente-bianchi', 'Marco Bianchi', 'cliente@bianchi.it', '+39 333 000 1000'),
  ('cliente-verdi', 'Laura Verdi', 'laura@verdi.it', '+39 333 000 2000'),
  ('cliente-neri', 'Giulia Neri', 'giulia@neri.it', '+39 333 000 3000')
on conflict (id) do nothing;

insert into public.users (id, username, password, name, role, email, client_id) values
  ('user-clementi', 'clementi', 'studio', 'Studio Clementi', 'Geometra', 'info@studioclementi.it', null),
  ('user-bianchi', 'bianchi', 'cliente', 'Marco Bianchi', 'Cliente', 'cliente@bianchi.it', 'cliente-bianchi')
on conflict (id) do nothing;

insert into public.projects (
  id, client_id, title, client, address, status, phase, updated_at, description,
  progress, next_action, next_action_owner, next_action_due
) values
  (
    'villa-bianchi',
    'cliente-bianchi',
    'Ristrutturazione Villa Bianchi',
    'Marco Bianchi',
    'Via Roma 18, Brescia',
    'In corso',
    'Pratica edilizia',
    '05 Mag 2026',
    'Intervento di ristrutturazione interna con aggiornamento catastale e coordinamento delle pratiche comunali.',
    62,
    'Attesa protocollo comunale e verifica ricevuta di deposito.',
    'Studio',
    '07 Mag 2026'
  ),
  (
    'negozio-verdi',
    'cliente-verdi',
    'Cambio destinazione uso - Verdi',
    'Laura Verdi',
    'Corso Milano 44, Verona',
    'In attesa',
    'Documenti cliente',
    '29 Apr 2026',
    'Preparazione documentazione per cambio destinazione d''uso da deposito a spazio commerciale.',
    35,
    'Invio documenti integrativi richiesti allo studio.',
    'Cliente',
    '09 Mag 2026'
  ),
  (
    'studio-neri',
    'cliente-neri',
    'Accatastamento Studio Neri',
    'Giulia Neri',
    'Piazza Garibaldi 7, Mantova',
    'Completato',
    'Consegna finale',
    '18 Apr 2026',
    'Accatastamento e consegna planimetrie aggiornate per studio professionale.',
    100,
    'Nessuna azione richiesta. Pratica archiviata.',
    'Nessuno',
    'Completata'
  )
on conflict (id) do nothing;

insert into public.documents (
  id, project_id, title, type, version, date, visibility, category, tags,
  document_status, parent_document_id, version_number, storage_key, file_name, mime_type, file_size
) values
  ('doc-relazione-bianchi', 'villa-bianchi', 'Relazione tecnica preliminare', 'PDF', 'v1.2', '02 Mag 2026', 'Cliente', 'Relazione tecnica', 'comune, preliminare', 'Pubblicato', '', 1, '', '', '', 0),
  ('doc-planimetria-bianchi', 'villa-bianchi', 'Planimetria stato di fatto', 'DWG', 'v1.0', '27 Apr 2026', 'Cliente', 'Planimetria', '', 'Pubblicato', '', 1, '', '', '', 0),
  ('doc-preventivo-bianchi', 'villa-bianchi', 'Preventivo opere tecniche', 'PDF', 'v1.1', '21 Apr 2026', 'Interno', 'Preventivo', '', 'Pubblicato', '', 1, '', '', '', 0),
  ('doc-integrazione-verdi', 'negozio-verdi', 'Richiesta integrazione documenti', 'PDF', 'v1.0', '29 Apr 2026', 'Cliente', 'Autorizzazione', '', 'Pubblicato', '', 1, '', '', '', 0)
on conflict (id) do nothing;

insert into public.timeline (id, project_id, date, title, body) values
  ('time-relazione-bianchi', 'villa-bianchi', '02 Mag 2026', 'Caricata relazione aggiornata', 'Aggiunta la nuova versione della relazione tecnica con le note richieste dal Comune.'),
  ('time-pratica-bianchi', 'villa-bianchi', '30 Apr 2026', 'Pratica edilizia inviata', 'La pratica e'' stata inviata tramite portale comunale. In attesa di protocollo.'),
  ('time-sopralluogo-bianchi', 'villa-bianchi', '24 Apr 2026', 'Sopralluogo completato', 'Misure verificate e fotografie di cantiere archiviate nella cartella interna.'),
  ('time-integrazione-verdi', 'negozio-verdi', '29 Apr 2026', 'Integrazione richiesta', 'Servono visura aggiornata e documento di identita'' del legale rappresentante.')
on conflict (id) do nothing;

insert into public.events (id, project_id, day, month, title, note) values
  ('event-protocollo-bianchi', 'villa-bianchi', '07', 'MAG', 'Protocollo pratica', 'Verifica ricezione dal portale comunale.'),
  ('event-call-bianchi', 'villa-bianchi', '13', 'MAG', 'Call con cliente', 'Aggiornamento su tempi e prossime firme.'),
  ('event-documenti-verdi', 'negozio-verdi', '09', 'MAG', 'Scadenza documenti', 'Attesa integrazioni da parte del cliente.')
on conflict (id) do nothing;

insert into public.checklist (id, project_id, label, status) values
  ('check-bianchi-1', 'villa-bianchi', 'Sopralluogo completato', 'Completato'),
  ('check-bianchi-2', 'villa-bianchi', 'Relazione tecnica aggiornata', 'Completato'),
  ('check-bianchi-3', 'villa-bianchi', 'Protocollo comunale', 'In corso'),
  ('check-bianchi-4', 'villa-bianchi', 'Consegna documentazione finale', 'Da fare'),
  ('check-verdi-1', 'negozio-verdi', 'Raccolta documenti cliente', 'In corso'),
  ('check-verdi-2', 'negozio-verdi', 'Verifica cambio destinazione d''uso', 'Da fare'),
  ('check-neri-1', 'studio-neri', 'Planimetrie consegnate', 'Completato')
on conflict (id) do nothing;

insert into public.requests (id, project_id, title, body, status, due_date) values
  ('req-bianchi-1', 'villa-bianchi', 'Conferma disponibilita'' per call', 'Lo studio propone una call di aggiornamento il 13 Maggio.', 'Aperta', '12 Mag 2026'),
  ('req-verdi-1', 'negozio-verdi', 'Invio visura aggiornata', 'Serve una visura camerale aggiornata per completare la pratica.', 'In attesa cliente', '09 Mag 2026')
on conflict (id) do nothing;
