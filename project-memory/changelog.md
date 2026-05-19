# Registro modifiche

## 2026-05-15

- Creata memoria operativa del progetto:
  - `agent.md`;
  - `project-memory/project-overview.md`;
  - `project-memory/architecture-and-deployment.md`;
  - `project-memory/product-ux-rules.md`;
  - `project-memory/roadmap.md`;
  - `project-memory/decision-log.md`;
  - `project-memory/changelog.md`.
- Aggiornata memoria con lo stato della vetrina InBolla:
  - vetrina su Vercel;
  - demo su Render `https://inbolla.onrender.com/`;
  - `DEMO_ONLY=true` per mantenere Render sulla demo;
  - CTA vetrina `Contattaci` e `Demo`;
  - form contatti Formspree `https://formspree.io/f/mnjwbaoz`;
  - messaggio hero: `Il cliente e' tranquillo. Il geometra lavora meglio.`;
  - screenshot reali della demo usati nella vetrina;
  - larghezza massima contenuti vetrina circa `1360px` per monitor larghi.
- Registrata email aziendale InBolla `inbolla.web@gmail.com` come riferimento per form, comunicazione, materiali informativi e account Brevo.
- Documentata la fase comunicazione/outreach:
  - aggiunto `project-memory/communication-and-outreach.md`;
  - registrato database contatti geometri in `database_geometri_rimini_forli_cesena/`;
  - registrati CSV e liste Brevo in `comunicazione_geometri/liste/`;
  - registrato template email Brevo in `comunicazione_geometri/brevo_email_inbolla/`;
  - annotato link campagna `https://inbolla.vercel.app`;
  - annotato stato template: logo, immagine `hero-cliente-reale.png`, paragrafo idea in grassetto, box condizioni beta e firma `inbolla.web@gmail.com`.
- Ristrutturato template Mailchimp `email_mailchimp_supabase.html`:
  - apertura generica `Buongiorno,`;
  - promessa di valore in alto prima della presentazione personale;
  - messaggio `Non e' un semplice gestionale...` in evidenza;
  - presentazione di Davide/Rimini spostata dopo il blocco di valore;
  - call to action finale: rispondere semplicemente `sono interessato`.
- Rifinito template Mailchimp:
  - rimosso il saluto iniziale;
  - headline aggiornata con `del suo lavoro da geometra`;
  - rimosso il paragrafo testuale ridondante sulla beta;
  - aggiunta CTA nel box benefici `Prova la DEMO senza impegno` verso `https://inbolla.onrender.com/`.
- Centrati i pulsanti del template Mailchimp e aggiunta nota sotto la CTA demo sul possibile tempo di avvio del servizio Render.
- Corretto il link del sito vetrina nei materiali di comunicazione da dominio `.com` a `https://inbolla.vercel.app` e ripulito il template Mailchimp con accenti e punteggiatura italiana corretti.

## Stato precedente consolidato

- Creata demo portale clienti InBolla/Studio Clementi.
- Separata area geometra e area cliente.
- Reso il cliente quasi completamente in sola lettura.
- Aggiunta gestione documentale con cartelle, stati, tag e versioni.
- Aggiunta gestione richieste al cliente e caricamento documenti richiesti.
- Aggiunta sezione CRM clienti.
- Aggiunta timeline/scadenzario.
- Aggiunti pop-up per le azioni operative lato geometra.
- Aggiunta pagina Settings notifiche e flag mail/messaggi nei pop-up.
- Predisposta integrazione Supabase per database e storage documenti.

## 2026-05-16

- Implementata prima versione semplice delle email operative:
  - creazione accesso cliente da CRM;
  - pubblicazione o aggiornamento documento visibile al cliente;
  - caricamento documento richiesto da parte del cliente verso lo studio.
- Aggiunti template HTML/testo server-side per le tre notifiche.
- Aggiornata migrazione Supabase per permettere notifiche non legate a un progetto.
- Lasciato WhatsApp/SMS disabilitato come canale reale.
