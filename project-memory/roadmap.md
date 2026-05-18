# Roadmap e backlog

## Priorita' alta

- Consolidare gestione documentale top-down.
- Rendere coerenti tutti i pop-up di creazione/modifica.
- Stabilizzare la navigazione laterale con sottosezioni.
- Collegare email transazionali Brevo per accesso cliente, documenti pubblicati e documenti caricati dal cliente.
- Chiarire in ogni pannello se un contenuto e' visibile o nascosto al cliente.
- Allineare demo locale, mockup e demo Render senza toccare il sito vetrina.
- Verificare dopo ogni deploy che Vercel mostri la vetrina e Render mostri solo la demo.
- Tenere aggiornata la CTA `Demo` della vetrina verso `https://inbolla.onrender.com/`.

## Priorita' media

- Rifinire contenuti commerciali della vetrina dopo i primi feedback reali.
- Testare la prima campagna Brevo su piccoli lotti e misurare risposte, bounce e disiscrizioni.
- Valutare una casella su dominio InBolla per invii futuri, al posto di `inbolla.web@gmail.com`.
- Aggiungere dominio personalizzato quando deciso.
- Rendere CRM clienti piu' completo:
  - dati fiscali;
  - dati aziendali;
  - contatti secondari;
  - note interne;
  - origine cliente;
  - stato relazione;
  - consenso privacy.
- Migliorare gestione versioni documenti.
- Aggiungere log accessi e download.
- Aggiungere audit trail per modifiche importanti.
- Aggiungere anteprime documento dove possibile.
- Aggiungere vista calendario/lista per eventi.

## Priorita' futura

- Separare eventualmente vetrina e demo in due repository o due progetti piu' puliti se la manutenzione diventa confusa.
- Invio reale WhatsApp/SMS.
- Invito cliente via email.
- Password cifrate e reset password.
- Ruoli multipli lato studio.
- Backup e restore.
- Policy GDPR e gestione consenso.
- Mobile responsive.
- Migrazione a stack piu' robusto se il progetto diventa prodotto:
  - Next.js;
  - PostgreSQL;
  - Prisma;
  - Auth.js;
  - storage S3-compatible;
  - Docker Compose.

## Idee prodotto

- Bot/assistente notifiche WhatsApp per aggiornare il cliente.
- Digest settimanale automatico della pratica.
- Stato pratica tipo Jira/Trello:
  - Todo;
  - Work in progress;
  - In attesa cliente;
  - In attesa ente;
  - Completato.
- Sezione "cosa serve da te" lato cliente.
- Area firme e accettazioni.
- Checklist documentale per pratica edilizia, antincendio, catastale, ecc.

## Non fare ora

- Non implementare invii WhatsApp/SMS reali.
- Non inviare campagne massime da Gmail in CC/CCN.
- Non trasformare la demo in una piattaforma multi-tenant completa prima di validare il flusso.
- Non ottimizzare mobile finche' il desktop non e' stabile.
- Non introdurre framework complessi senza decisione esplicita.
