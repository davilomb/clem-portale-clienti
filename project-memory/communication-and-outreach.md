# Comunicazione e outreach

## Obiettivo

La comunicazione commerciale di InBolla e' rivolta a geometri e studi tecnici del territorio, con un primo focus su Rimini e Forli-Cesena.

Il tono deve restare professionale, locale e personale: Davide si presenta come sviluppatore di Rimini che conosce il contesto degli studi tecnici e propone una breve chiamata conoscitiva, senza forzare una vendita immediata.

## Messaggio commerciale corrente

Punti da mantenere nelle email e nei materiali:

- InBolla semplifica la gestione delle pratiche e la comunicazione con i clienti.
- Il primo valore e' per il cliente dello studio: stato pratica, documenti, aggiornamenti e richieste in un unico posto.
- Il valore per lo studio e' ridurre messaggi sparsi, richieste ripetitive e passaggi manuali.
- InBolla e' in beta: i primi studi possono avere condizioni economiche agevolate e supporto personalizzato.
- La CTA principale non e' aggressiva: visitare il sito ufficiale e/o rispondere alla mail per organizzare una breve chiamata conoscitiva.

Link pubblico da usare nei materiali email:

```txt
https://inbolla.vercel.com
```

Email mittente attualmente usata nei template:

```txt
inbolla.web@gmail.com
```

## Database contatti geometri

Cartella:

```txt
database_geometri_rimini_forli_cesena/
```

File principali:

- `geometri_rimini_forli_cesena.sqlite`
- `geometri_rimini_forli_cesena_contatti.csv`
- `geometri_rimini_forli_cesena_contatti.json`
- `README.md`

Copertura consolidata:

- 637 record Rimini;
- 679 record Forli-Cesena;
- 1.316 record totali;
- 14 siti iscritti Forli-Cesena raccolti.

Fonti principali:

- `https://www.geometri.rimini.it/albo/`
- `https://www.geometri.rimini.it/albo-stp/`
- `https://www.colgeofc.it/iscritti-geometri`
- `https://www.colgeofc.it/siti-iscritti`

Nota privacy: codice fiscale e data di nascita non sono stati importati, anche quando presenti sulle fonti, per minimizzazione del dato. Prima di invii massivi reali servono attenzione a basi giuridiche, opt-out, gestione disiscrizioni e tracciamento consensi dove applicabile.

## Liste email e Brevo

Cartella liste:

```txt
comunicazione_geometri/liste/
```

File utili:

- `contatti_email_ordinaria.csv`: lista completa dei record con email ordinaria estratta dal database.
- `contatti_email_ordinaria_senza_pec.csv`: lista stretta dei record con email ordinaria e senza PEC.
- `batch_email_ordinaria_50/`: suddivisione in batch da massimo 50 contatti.
- `brevo_import_geometri_email_ordinaria.csv`: CSV nello schema Brevo del file campione.
- `brevo_import_geometri_email_ordinaria.report.txt`: report di validazione.

Schema Brevo usato:

```txt
CONTACT ID, EMAIL, FIRSTNAME, LASTNAME, SMS, LANDLINE_NUMBER, WHATSAPP, INTERESTS
```

Stato validazione Brevo:

- 266 email valide uniche importabili;
- 398 righe escluse per email non valida o mascherata (`*****`);
- 0 duplicate escluse nell'ultima generazione;
- 1 contatto con cellulare/SMS valorizzato;
- 0 telefoni fissi valorizzati nel CSV Brevo.

## Template email Brevo

Cartella pacchetto:

```txt
comunicazione_geometri/brevo_email_inbolla/
```

File principali:

- `email_brevo_inbolla.html`
- `README.md`
- `assets/inbolla-logo-full.png`
- `assets/hero-cliente-reale.png`
- `assets/demo-cruscotto.png`
- `assets/inbolla-mascot.png`

Zip pronto:

```txt
comunicazione_geometri/brevo_email_inbolla.zip
```

Stato template corrente:

- layout email a 640px;
- logo InBolla in alto;
- mascotte rimossa dall'angolo destro dell'header;
- testo iniziale a larghezza piena e giustificato;
- paragrafo `L'idea nasce...` in grassetto;
- immagine principale: `assets/hero-cliente-reale.png`;
- box `Condizioni beta agevolate` con `condizioni economiche agevolate` in grassetto;
- CTA `Visita il sito ufficiale` verso `https://inbolla.vercel.com`;
- firma con `inbolla.web@gmail.com`;
- personalizzazione cognome Brevo: `{{ contact.LASTNAME }}`.

Oggetto consigliato:

```txt
InBolla, una piattaforma per semplificare il rapporto tra studio e cliente
```

## Regole operative per invii

- Non usare CC o CCN per invii massivi.
- Preferire Brevo o servizio equivalente, con una mail separata per ogni contatto.
- Importare il CSV Brevo gia' validato.
- Caricare le immagini nella libreria Brevo se gli `src="assets/..."` non vengono mantenuti.
- Fare sempre invio test prima della campagna.
- Procedere a lotti e controllare bounce, aperture, risposte e disiscrizioni.
- Mantenere una frase di opt-out chiara.
- Evitare automazioni reali dentro la demo gestionale finche' non esiste una fase dedicata a provider, privacy, log invii e test.
