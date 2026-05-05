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

## Prossimi passaggi tecnici

1. Convertire il prototipo in una web app con backend reale.
2. Sostituire `data/db.json` con PostgreSQL.
3. Aggiungere password cifrate.
4. Aggiungere upload reale dei documenti in storage privato.
5. Aggiungere download protetto dei file.
6. Aggiungere versionamento documenti.
7. Preparare Docker Compose per sviluppo locale e poi deploy.

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
