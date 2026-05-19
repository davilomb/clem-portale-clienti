# Registro decisioni

## 2026-05-15 - Memoria operativa

Decisione: creare `agent.md` e la cartella `project-memory/` per conservare regole, architettura, UX, roadmap e storico decisioni.

Motivo: il progetto sta crescendo per iterazioni e serve una base stabile per non perdere contesto tra le conversazioni.

## 2026-05-15 - Notifiche email operative

Decisione: concentrare la prima fase notifiche sulle email transazionali Brevo, lasciando WhatsApp/SMS disabilitati.

Eventi prioritari:

- creazione accesso cliente;
- pubblicazione o aggiornamento documento visibile al cliente;
- caricamento documento da parte del cliente verso lo studio.

Regola: i documenti non vanno allegati alla mail; la mail deve portare il cliente o il geometra dentro il portale.

## 2026-05-15 - Comunicazione e outreach geometri

Decisione: documentare la fase di comunicazione commerciale in `project-memory/communication-and-outreach.md` e mantenere separati database contatti, liste e template email dalla demo gestionale.

Materiali correnti:

- database contatti in `database_geometri_rimini_forli_cesena/`;
- liste e CSV Brevo in `comunicazione_geometri/liste/`;
- template email Brevo in `comunicazione_geometri/brevo_email_inbolla/`;
- link CTA campagna: `https://inbolla.vercel.app`.

Motivo: la campagna verso geometri e studi tecnici e' una fase commerciale esterna al prodotto; va tracciata per non perdere contesto, ma non deve introdurre automazioni reali nel gestionale senza una fase dedicata a provider, privacy e test.

## Separazione sito vetrina e demo

Decisione: mantenere separati il sito vetrina su Vercel e la demo gestionale su Render.

Regola aggiornata: `main` e' il ramo da tenere allineato per la produzione. Vercel usa `main` per la vetrina; Render puo' usare lo stesso codice ma deve avere `DEMO_ONLY=true` per mostrare solo la demo.

Motivo: evita che il sito vetrina abbia cold start Render e mantiene la demo gestionale su un servizio backend Node.

## Vetrina InBolla

Decisione: creare una vetrina essenziale per spiegare InBolla come servizio premium per geometri e clienti.

Messaggio: `Il cliente e' tranquillo. Il geometra lavora meglio.`

Motivo: il valore non e' solo organizzare pratiche internamente, ma far percepire al cliente chiarezza, cura e professionalita', riducendo richieste ripetitive e incomprensioni.

## CTA e contatti vetrina

Decisione: mantenere sempre visibili due azioni principali:

- `Contattaci`, collegato al form;
- `Demo`, collegato a Render.

Decisione tecnica: usare Formspree per il form contatti della vetrina.

Endpoint corrente:

```txt
https://formspree.io/f/mnjwbaoz
```

## Layout vetrina su schermi larghi

Decisione: limitare la larghezza massima dei contenuti della vetrina a circa `1360px`, lasciando bordi liberi su monitor molto larghi.

Motivo: a tutto schermo il sito risultava troppo largo e meno piacevole da guardare.

## Cliente quasi sempre in sola lettura

Decisione: il cliente non gestisce il progetto, ma puo' caricare documenti solo quando il geometra pubblica una richiesta specifica.

Motivo: il portale deve restare semplice e controllato dallo studio.

## Pop-up per azioni di modifica

Decisione: form di creazione e modifica devono aprirsi in pop-up, non stare stabilmente in colonne laterali.

Motivo: ridurre confusione visiva e mantenere le sezioni principali leggibili.

## Documentale top-down

Decisione: documenti sempre organizzati per cliente, progetto, cartella e file.

Motivo: il geometra deve ragionare come in un gestionale documentale serio, con filtri cascata e ricerca.

## Timeline e calendario unificati

Decisione: aggiornamenti, scadenze e appuntamenti fanno parte dello stesso sistema informativo.

Motivo: evitare duplicazioni tra "timeline" e "calendario"; cambiano solo le viste.

## Notifiche prima grafiche, poi operative

Decisione: inserire prima UI e flag notifiche, senza obbligare subito all'invio reale.

Motivo: validare l'esperienza prima di integrare provider email, WhatsApp o SMS.
