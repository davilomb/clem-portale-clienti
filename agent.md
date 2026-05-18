# InBolla - memoria operativa del progetto

Questo file e' il punto di ingresso per lavorare sul progetto InBolla, il portale clienti per studi tecnici e geometri nato per Studio Clementi.

Da qui in avanti, prima di modificare il portale o proporre nuove feature, consultare questa memoria e mantenerla aggiornata.

## Regola principale

InBolla oggi e' composto da due esperienze coordinate:

- sito vetrina: comunica la proposta commerciale a geometri e studi tecnici;
- demo gestionale: mostra il portale operativo con area geometra e area cliente.

La promessa centrale e' sempre la stessa: InBolla rende piu' evidente il valore del lavoro del geometra, alleggerisce la gestione relazionale e fa sentire il cliente tranquillo perche' trova stato pratica, documenti, richieste, timeline e prossimi passi in un unico posto.

Nella demo gestionale il cliente deve leggere, capire, scaricare e caricare solo quando richiesto. Il geometra deve governare tutto dal backend.

## File di memoria

- [Visione prodotto](project-memory/project-overview.md)
- [Architettura e deploy](project-memory/architecture-and-deployment.md)
- [Regole UX e comportamento utente](project-memory/product-ux-rules.md)
- [Roadmap e backlog](project-memory/roadmap.md)
- [Piano notifiche email](project-memory/email-notifications-plan.md)
- [Registro decisioni](project-memory/decision-log.md)
- [Registro modifiche](project-memory/changelog.md)
- [Comunicazione e outreach](project-memory/communication-and-outreach.md)

## Come usare questa memoria

1. Prima di iniziare una nuova modifica, leggere i file rilevanti.
2. Se la richiesta cambia una regola di prodotto, aggiorna `product-ux-rules.md`.
3. Se cambia la struttura tecnica, aggiorna `architecture-and-deployment.md`.
4. Se nasce una decisione importante, aggiungila a `decision-log.md`.
5. Se emerge una feature futura, aggiungila a `roadmap.md`.
6. Dopo una modifica significativa, aggiungi una voce a `changelog.md`.

## Confini da rispettare

- Non rompere la separazione tra sito vetrina e demo gestionale.
- Non confondere Vercel e Render: Vercel serve la vetrina, Render serve la demo.
- Non spostare funzioni di scrittura lato cliente salvo esplicita richiesta.
- Non trasformare la demo gestionale in una landing page.
- Non aggiungere automazioni reali di email, WhatsApp o SMS senza una fase dedicata di configurazione provider, privacy e test.
- Non committare segreti, chiavi Supabase, API key o password reali.

## Stato corrente in breve

- Nome prodotto: InBolla.
- Studio demo: Studio Clementi.
- Utente geometra demo: `clementi` / `studio`.
- Utente cliente demo: `bianchi` / `cliente`.
- Demo online: Render, `https://inbolla.onrender.com/`, con `DEMO_ONLY=true`.
- Sito vetrina: Vercel, ramo `main`.
- CTA vetrina: `Contattaci` verso sezione/form contatti e `Demo` verso Render.
- Form contatti vetrina: Formspree endpoint `https://formspree.io/f/mnjwbaoz`.
- Email aziendale/comunicazione InBolla: `inbolla.web@gmail.com`.
- Database/documenti: predisposizione Supabase con Storage privato.
- Notifiche: interfaccia grafica e tabella notifiche predisposte; invio reale da gestire come fase successiva.
- Comunicazione commerciale: database geometri Rimini/Forli-Cesena e pacchetto Brevo gia' preparati in `database_geometri_rimini_forli_cesena/` e `comunicazione_geometri/`.
