# Architettura e deploy

## Struttura cartelle

Repository locale:

```txt
/Users/davidelombardini/Documents/New project 2
```

Cartelle principali:

- `Pepa Geometra Portal/`: cartella principale del progetto attivo. Contiene sia la vetrina sia la demo gestionale.
- `Studio Clementi Portal Mockup/`: ambiente locale di test/mockup usato per sperimentare senza rompere la demo online.
- `project-memory/`: memoria operativa del progetto.
- `database_geometri_rimini_forli_cesena/`: database locale dei contatti geometri e studi tecnici raccolti da fonti pubbliche, con SQLite, CSV e JSON.
- `comunicazione_geometri/`: materiali commerciali per outreach, liste CSV, template email e pacchetto Brevo.

Nota storica: la cartella `Pepa Geometra Portal/` mantiene il nome vecchio della fase iniziale, ma il prodotto e l'interfaccia devono parlare di InBolla e Studio Clementi.

## Rami Git e piattaforme

### `main`

Uso previsto: branch principale da tenere aggiornato per la vetrina Vercel e per la base della demo Render.

Regola: prima di pubblicare, verificare quale piattaforma verra' aggiornata:

- Vercel pubblica la vetrina;
- Render pubblica la demo con `DEMO_ONLY=true`.

### `codex-inbolla-sito-vetrina`

Uso storico/di lavoro: branch usato durante la costruzione della vetrina e l'allineamento demo.

Regola: non dare per scontato che sia il branch di produzione. Controllare sempre branch collegati su GitHub, Vercel e Render.

## Deploy attuale

### Render

Demo online:

```txt
https://inbolla.onrender.com/
```

Configurazione prevista:

- Runtime: Node.
- Build command: `echo "No build required"` oppure comando equivalente non vuoto.
- Start command: `node server.js`.
- Root directory: cartella della demo se impostata da Render.
- Piano attuale: free.

`render.yaml` nella demo definisce:

```txt
name: inbolla-demo
runtime: node
startCommand: node server.js
DEMO_ONLY=true
```

Con `DEMO_ONLY=true`, quando si apre `/` Render reindirizza alla demo gestionale (`/demo`). Questo evita che il dominio Render mostri la vetrina.

### Vercel

Uso previsto: sito vetrina InBolla.

Configurazione:

- branch produzione: `main`;
- app statica servita da `index.html`, `app.js`, `styles.css`;
- `vercel.json` gestisce rewrite puliti verso `index.html`;
- la CTA `Demo` deve puntare a `https://inbolla.onrender.com/`.

Regola: non confondere il deploy Vercel con la demo Render. Se Vercel mostra ancora la demo o una versione vecchia, controllare prima che `main` sia aggiornato e pushato su GitHub.

### Form contatti

Il form della vetrina usa Formspree:

```txt
https://formspree.io/f/mnjwbaoz
```

Email aziendale di riferimento:

```txt
inbolla.web@gmail.com
```

La destinazione reale delle notifiche Formspree non si imposta nel codice del sito: va configurata nel pannello Formspree del form `mnjwbaoz`, cambiando l'email di destinazione/target email verso `inbolla.web@gmail.com`.

Non servono backend o chiavi segrete per questo form nella versione attuale.

## Stack tecnico attuale

La demo attuale e' volutamente semplice:

- frontend: HTML/CSS/JavaScript vanilla;
- backend: Node.js con `server.js`;
- dati locali fallback: `data/db.json`;
- database online: Supabase PostgreSQL;
- documenti online: Supabase Storage privato;
- deploy vetrina: Vercel;
- deploy demo: Render con `DEMO_ONLY=true`.

## Modalita' dati

### Locale senza Supabase

Se le variabili Supabase non sono presenti, il backend usa dati locali e metadati demo.

### Online con Supabase

Se configurate le variabili:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
```

il backend usa Supabase per database e storage documentale.

La service role key e' segreta e non deve mai essere committata.

## Documenti

I documenti devono essere organizzati top-down:

```txt
Cliente -> Progetto -> Cartella -> Documento -> Versione
```

I documenti caricati dal cliente non sono una sezione globale separata: devono restare collegati al cliente e al progetto corrispondente, dentro una sottosezione chiara.

## Notifiche

Stato corrente:

- UI Settings per abilitare/disabilitare canali;
- flag nei pop-up lato geometra: invia mail, invia messaggio;
- predisposizione tabella/lista notifiche;
- email potenzialmente collegabile a provider;
- WhatsApp/SMS per ora solo predisposti.

Fase successiva necessaria prima dell'invio reale:

- scelta provider;
- template email/messaggio;
- consenso e privacy;
- log invii;
- retry e gestione errori;
- ambiente di test separato.

Per le email transazionali della demo gestionale il provider scelto e' Brevo, creato con l'account `inbolla.web@gmail.com`. Le chiavi restano nelle variabili Render; nome mittente, email mittente, reply-to, default delle spunte e predisposizione WhatsApp/SMS sono gestiti nel portale Geometra tramite Settings e salvati nella tabella Supabase `app_settings`.

La tabella `users` contiene sia utenti cliente sia utenti studio. Nei Settings si gestiscono gli utenti con ruolo `Geometra`; le loro email vengono suggerite come possibili mittenti delle comunicazioni, ma devono essere verificate in Brevo per funzionare realmente.

## Comunicazione commerciale esterna

I materiali di outreach non fanno parte della demo gestionale e non devono essere confusi con le notifiche operative del prodotto.

Asset e dati correnti:

- database contatti: `database_geometri_rimini_forli_cesena/`;
- liste importabili: `comunicazione_geometri/liste/`;
- template Brevo: `comunicazione_geometri/brevo_email_inbolla/email_brevo_inbolla.html`;
- pacchetto ZIP: `comunicazione_geometri/brevo_email_inbolla.zip`.

Regola: prima di modificare campagne, liste o template email, consultare anche `project-memory/communication-and-outreach.md`.
