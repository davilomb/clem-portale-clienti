# Regole UX e comportamento utente

## Stile desiderato dal committente

Il committente ragiona per iterazioni visive: osserva il portale, seleziona aree specifiche e chiede correzioni logiche o gerarchiche. Le risposte migliori sono operative, concrete e progressive.

Preferenze emerse:

- ordine gerarchico chiaro;
- schermate meno confuse e piu' tabellari;
- uso migliore dello spazio orizzontale;
- separazione visiva tra lettura e gestione;
- pop-up per azioni di modifica/creazione;
- niente box laterali permanenti per form operativi;
- navigazione laterale con sottosezioni cliccabili;
- componenti simili a un gestionale serio, non a un sito marketing.

## Regole sito vetrina

La vetrina deve comunicare in modo semplice e non affollato.

Messaggio centrale:

- il cliente e' tranquillo;
- il geometra lavora meglio;
- il cliente sa dove guardare;
- lo studio riduce incomprensioni, perdite di tempo e gestione relazionale ripetitiva;
- InBolla rende piu' percepibile il valore del lavoro del geometra.

Regole visuali:

- pochi concetti per sezione;
- ogni blocco deve avere spazio per respirare;
- evitare testi lunghi e blocchi troppo densi;
- usare screenshot reali della demo quando si parla di funzioni;
- non inventare mockup quando esiste gia' una schermata reale;
- su schermi larghi, contenuto centrato con larghezza massima circa `1360px`;
- mantenere i bordi laterali liberi sui monitor molto larghi.

Hero:

- headline corrente: `Il cliente e' tranquillo.` su prima riga e `Il geometra lavora meglio.` su seconda riga;
- immagine hero: screenshot reale dell'area cliente con progetto, stato, timeline e documenti;
- CTA hero uguali a quelle in header: `Contattaci` outline e `Demo` verde.

Funzioni:

- non usare un titolo grande ridondante sopra le funzioni principali se appesantisce la lettura;
- alternare testo e immagine;
- usare screenshot reali per timeline lato geometra e gestione documentale;
- per notifiche e WhatsApp/SMS, usare un mockup grafico solo se non esiste ancora una schermata reale.

Fascia `Perche' ti serve`:

- deve parlare del valore percepito del geometra;
- CTA demo ben valorizzata;
- visual focale su relazione/fiducia, non su strumenti fuori contesto.

## Regole lato cliente

Il cliente:

- legge i dati del progetto;
- consulta documenti;
- apre e scarica file;
- vede timeline/scadenze;
- risponde alle richieste quando necessario;
- carica documenti solo se il geometra lo richiede.

Il cliente non deve:

- creare nuovi progetti;
- creare aggiornamenti;
- modificare documenti;
- creare cartelle;
- vedere compenso tecnico o importo lavori;
- vedere checklist interna dello studio;
- vedere note interne CRM.

## Regole lato geometra

Il geometra:

- gestisce clienti, progetti, documenti, cartelle, task, timeline e richieste;
- decide la visibilita' di ogni elemento;
- usa pop-up per inserimenti e modifiche;
- vede sezioni interne non visibili al cliente;
- puo' nascondere task completati;
- puo' modificare/eliminare task e voci timeline.

## Documentale

La gestione documentale deve essere centrale e strutturata:

- vista aggregata per cliente, progetto, cartella;
- filtri cascata: scegliendo un cliente si vedono solo i suoi progetti; scegliendo un progetto si vedono solo le sue cartelle;
- ricerca libera per documento, cliente, progetto, cartella e tag;
- cartelle custom create dal geometra;
- cartelle visibili anche se vuote;
- tabella documenti con titolo, versione, commento, data, stato, azioni;
- stati documento: Bozza, Provvisorio, Definitivo;
- tag liberi con suggerimenti da tag gia' usati;
- estensione/formato file letto automaticamente dal file caricato.

## Timeline e calendario

Timeline e calendario rappresentano lo stesso mondo informativo:

- una voce puo' essere aggiornamento, scadenza o appuntamento;
- deve poter avere data e, facoltativamente, ora;
- deve poter essere visibile o nascosta al cliente;
- deve avere colore;
- la timeline deve essere cronologica da sinistra a destra;
- lo storico deve scorrere solo nel suo riquadro, non nella pagina;
- il focus predefinito deve andare alla prossima data utile.

Il vecchio blocco "Cosa succede adesso" non deve essere gestito manualmente: l'informazione deve derivare dalla timeline/scadenzario.

## Pop-up

Regola corrente:

- tutte le azioni di creazione/modifica devono aprirsi in pop-up;
- aprire un pop-up non deve far scorrere la pagina;
- chiudere un pop-up deve lasciare l'utente vicino al punto in cui si trovava;
- i pop-up devono contenere eventuali flag notifiche quando l'azione puo' generare comunicazioni.

## Visibilita'

Non usare etichette generiche come "Vista".

Usare sempre etichette esplicite:

- `Visibile al cliente`;
- `Nascosto al cliente`;
- `Uso interno`;
- `Solo grafica`;
- `Mockup`.

## Notifiche

Nella UI lato geometra devono comparire:

- `Invia mail al cliente`;
- `Invia messaggio al cliente`;
- eventuale nota che il canale e' solo predisposto se non configurato.

Le notifiche reali non devono partire automaticamente finche' non esiste una fase tecnica dedicata.
