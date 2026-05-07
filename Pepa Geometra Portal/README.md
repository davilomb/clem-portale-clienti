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

In locale, senza Supabase, il portale continua a salvare solo i metadati documento in `db.json`.

## Prossimi passaggi tecnici

1. Aggiungere password cifrate.
2. Aggiungere invito email cliente.
3. Aggiungere versionamento documenti.
4. Aggiungere log accessi e download.
5. Aggiungere notifiche email.
6. Preparare backup e procedure GDPR.

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
