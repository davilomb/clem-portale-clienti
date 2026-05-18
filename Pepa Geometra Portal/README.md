# Studio Clementi - Portale Clienti

Prima bozza locale del portale clienti per Studio Clementi.

## Come avviarlo

Da questa cartella esegui:

```bash
npm start
```

Poi apri:

```txt
http://127.0.0.1:4173
```

Profili demo:

- Geometra: `clementi` / `studio`
- Cliente: `bianchi` / `cliente`

## Cosa contiene questa versione

- Login locale con sessione.
- Backend locale in Node.js.
- Dati salvati in `data/db.json`.
- Supporto opzionale a Supabase per database online e documenti.
- Dashboard geometra.
- Area cliente in sola lettura.
- Progetti gestiti solo dal geometra.
- Documenti gestiti solo dal geometra.
- Timeline degli aggiornamenti gestita solo dal geometra.
- Calendario/scadenze gestiti solo dal geometra.
- Creazione cliente e accesso cliente dal backend geometra.
- Dettaglio progetto navigabile.
- Prossima azione visibile nel cruscotto.
- Checklist progetto.
- Richieste al cliente in sola lettura lato cliente.

## Database e documenti online con Supabase

La app funziona in due modalita':

- senza variabili Supabase: usa `data/db.json`, utile per sviluppo locale;
- con variabili Supabase: usa database PostgreSQL e Storage Supabase.

### 1. Crea progetto Supabase

1. Vai su `https://supabase.com`.
2. Crea un nuovo progetto.
3. Scegli una password database e conservala.
4. Aspetta che il progetto sia pronto.

### 2. Crea tabelle e bucket

1. Apri il progetto Supabase.
2. Vai su `SQL Editor`.
3. Crea una nuova query.
4. Copia tutto il contenuto di `supabase/schema.sql`.
5. Esegui la query.

Questo crea:

- tabelle clienti, utenti, progetti, documenti, timeline, scadenze, checklist e richieste;
- bucket privato `project-documents`;
- dati demo iniziali.

### 3. Recupera le chiavi Supabase

Nel progetto Supabase vai su:

```txt
Project Settings -> API
```

Recupera:

- Project URL;
- service_role key.

Attenzione: la `service_role key` e' segreta. Non va pubblicata su GitHub.

### 4. Configura Render

Nel servizio Render vai su:

```txt
Environment
```

Aggiungi:

```txt
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=la-tua-service-role-key
SUPABASE_STORAGE_BUCKET=project-documents
```

Poi fai:

```txt
Manual Deploy -> Deploy latest commit
```

### 5. Upload documenti

Quando Supabase e' attivo:

- il geometra puo' caricare un file dal modulo documento;
- il file viene salvato nel bucket privato `project-documents`;
- nel database viene salvata solo la scheda documento;
- il cliente puo' aprire solo documenti visibili al cliente e relativi ai propri progetti.
- ogni documento puo' avere categoria, tag, stato e versioni;
- quando viene pubblicato un documento visibile al cliente il geometra puo' scegliere se inviare una notifica via mail e/o predisporre una notifica via chat WhatsApp/SMS.

In locale, senza Supabase, il portale continua a salvare solo i metadati documento in `db.json`.

## Notifiche email reali

Il canale email e' collegato al backend in versione semplice. Il server crea sempre un record nella tabella/lista `notifications`, poi prova l'invio tramite provider configurato.

Eventi coperti:

- creazione cliente/accesso CRM: email al cliente con link portale, username e password temporanea;
- nuovo documento o nuova versione visibile al cliente: email al cliente con progetto, cartella, versione, stato e commento;
- documento caricato dal cliente su richiesta: email allo studio/geometra.

Il file non viene mai allegato alla mail: la mail porta sempre al portale.

Stati possibili della notifica:

- `Da inviare`;
- `Inviata`;
- `Errore: ...`;
- `Solo grafica` per canali WhatsApp/SMS non ancora attivi.

Configura le variabili ambiente:

```txt
APP_PUBLIC_URL=https://indirizzo-pubblico-del-portale
EMAIL_PROVIDER=brevo
EMAIL_FROM=inbolla.web@gmail.com
EMAIL_FROM_NAME=InBolla
BREVO_API_KEY=...
```

Provider supportati: `brevo`, `resend`, `sendgrid`. Per test locale senza invio reale puoi usare `EMAIL_PROVIDER=console`, che stampa il contenuto email nel terminale.

Le chiavi restano sempre su Render/Supabase e non vengono salvate nel portale. Dal menu `Settings` del portale Geometra puoi invece gestire:

- email abilitate/disabilitate;
- mittente email e reply-to usati dal backend;
- utenti studio autorizzati lato Geometra;
- predisposizione futura WhatsApp/SMS.

Nota importante per Brevo: l'email mittente scelta nei Settings deve essere un mittente verificato in Brevo, altrimenti l'invio reale andra' in errore e verra' tracciato nella tabella `notifications`.

Il canale WhatsApp/SMS resta per ora solo grafico/predisposto: la spunta crea una notifica con stato `Solo grafica`, senza chiamare provider esterni.

## Upgrade gestione documentale

Se il database Supabase esiste gia', prima del deploy della nuova versione esegui nel `SQL Editor`:

```txt
supabase/upgrade_document_management.sql
```

Questo aggiunge:

- categoria documento;
- tag;
- stato documento;
- relazione tra versioni;
- numero versione;
- tabella `notifications` per tracciare notifiche multicanale: email inviate dal backend e WhatsApp/SMS predisposte;
- tabella `app_settings` per salvare i Settings operativi di notifiche, mittenti e predisposizione WhatsApp;
- supporto a notifiche non collegate direttamente a un progetto, come la mail di creazione accesso cliente.

Per l'invio email reale serve configurare un provider supportato. Per WhatsApp/SMS servira' in una fase successiva un provider come Twilio, MessageBird, Brevo Conversations o Meta WhatsApp Cloud API.

## Prossimi passaggi tecnici

1. Aggiungere password cifrate.
2. Aggiungere cambio password/reset password.
3. Aggiungere preview strutturata dei template email prima dell'invio reale.
4. Aggiungere versionamento documenti.
5. Aggiungere log accessi e download.
6. Collegare l'invio reale delle notifiche WhatsApp/SMS.
7. Preparare backup e procedure GDPR.

## Stack consigliato per la fase successiva

- Next.js per app web e API.
- PostgreSQL per i dati.
- Prisma per gestire il database.
- Auth.js per login e sessioni.
- MinIO o storage S3-compatible per i documenti.
- Docker Compose per avvio locale.

## Come metterlo online per una prova

### Opzione rapida: Render

1. Crea un repository GitHub con questi file.
2. Vai su Render e crea un nuovo Web Service.
3. Collega il repository.
4. Usa:
   - Build command: vuoto
   - Start command: `node server.js`
5. Render dara' un indirizzo pubblico tipo `https://nome-progetto.onrender.com`.

Nota: questa versione salva i dati in `data/db.json`. Su molti hosting cloud il filesystem puo' essere temporaneo o resettarsi ai deploy. Va bene per una prova breve, non per dati reali.

### Opzione stabile per farlo usare davvero

Prima di usarlo con clienti reali conviene aggiungere:

- database PostgreSQL;
- password cifrate;
- upload documenti protetto;
- backup;
- HTTPS e dominio;
- gestione privacy/GDPR.

### Opzione VPS

Su un piccolo server Linux puoi usare Docker:

```bash
docker build -t studio-clementi-portale-clienti .
docker run -p 4173:4173 studio-clementi-portale-clienti
```
