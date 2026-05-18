# Piano notifiche email

## Provider scelto

Provider preferito per la fase corrente: Brevo, usando email transazionali via API.

Motivo: il progetto richiede notifiche automatiche legate ad azioni operative, non campagne marketing.

## Canali

Stato corrente aggiornato:

- Email: versione semplice implementata nel backend con template HTML/testo e log `notifications`.
- WhatsApp/SMS: disabilitato per ora, resta solo predisposto graficamente.

## Eventi email prioritari

### 1. Creazione accesso cliente

Trigger: il geometra crea un nuovo cliente/accesso nel CRM.

Destinatario: email del cliente appena creato.

Contenuto:

- saluto con nome cliente;
- nome dello studio;
- link al portale;
- username;
- password temporanea;
- invito a cambiare password quando la funzione sara' disponibile;
- nota di sicurezza: non inoltrare le credenziali.

### 2. Documento pubblicato o nuova versione

Trigger: il geometra carica un nuovo documento o aggiorna una versione esistente, con visibilita' cliente e flag email attivo.

Destinatario: cliente collegato al progetto.

Contenuto:

- progetto;
- cartella/categoria documento;
- titolo documento;
- versione;
- stato documento;
- commento breve;
- data caricamento;
- CTA per aprire il portale.

Non allegare il file: il cliente deve entrare nel portale per consultarlo o scaricarlo.

### 3. Documento caricato dal cliente

Trigger: il cliente carica un documento richiesto dal pop-up richieste.

Destinatario: geometra/studio.

Contenuto:

- cliente;
- progetto;
- richiesta collegata;
- titolo documento richiesto;
- eventuale commento cliente;
- CTA per aprire il progetto nel backend.

## Regole operative

- Ogni email deve creare un record nella tabella/lista `notifications`.
- Lo stato deve essere tracciato: `Da inviare`, `Inviata`, `Errore`.
- Le preferenze operative sono salvate in `app_settings` con id `notifications`.
- I Settings del portale Geometra permettono di cambiare mittente, reply-to, default delle spunte e predisposizione WhatsApp/SMS senza toccare le variabili segrete.
- Gli utenti studio lato Geometra sono gestiti dalla tabella `users` con ruolo `Geometra`; le loro email possono essere usate come mittenti suggeriti.
- Per la fase iniziale si puo' inviare subito durante la richiesta HTTP; in produzione conviene usare una coda/job asincrono.
- Non inviare notifiche per elementi marcati `Interno` o `Nascosto al cliente`.
- Non inviare allegati documento via email.
- Non salvare API key nel repository.

## Variabili ambiente previste

```txt
EMAIL_PROVIDER=brevo
BREVO_API_KEY=...
EMAIL_FROM=inbolla.web@gmail.com
EMAIL_FROM_NAME=InBolla
APP_PUBLIC_URL=https://inbolla.onrender.com
```

Brevo e' stato creato con l'account `inbolla.web@gmail.com`, che e' anche il riferimento aziendale per comunicazione, form e materiali informativi InBolla.

## Evoluzione consigliata

1. Aggiungere preview strutturata dei tre template dentro Settings.
2. Aggiungere `templateType` nelle notifiche.
3. Salvare `providerMessageId` restituito da Brevo.
4. Collegare webhook Brevo per eventi delivered/opened/clicked/bounce.
5. Solo dopo, valutare WhatsApp/SMS.

## Aggiornamento implementato

- Backend: aggiunta persistenza settings notifiche, endpoint `/api/settings/notifications`, endpoint `/api/users` per creare/modificare utenti studio, mittente dinamico per invio email.
- Database: aggiunta tabella `app_settings`; `notifications.project_id` resta nullable per email accesso non legate a progetto.
- Frontend: Settings mostra canali email, predisposizione WhatsApp, utenti studio, creazione nuovo utente Geometra e scelta dell'email mittente.
