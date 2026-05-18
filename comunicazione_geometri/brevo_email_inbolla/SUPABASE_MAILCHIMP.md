# Immagini email su Supabase per Mailchimp

Mailchimp accetta l'HTML, ma le immagini devono essere raggiungibili da URL pubblici. I percorsi locali come `assets/...` funzionano solo in anteprima locale, non dentro la campagna.

## 1. Crea un bucket pubblico

Nel dashboard Supabase:

1. Apri il progetto Supabase.
2. Vai su `Storage`.
3. Crea un nuovo bucket chiamato:

```txt
email-assets
```

4. Impostalo come `Public`.

Non usare il bucket privato `project-documents` della demo: quello e' pensato per documenti cliente/progetto e usa link firmati o privati. Per le email servono immagini pubbliche e stabili.

## 2. Carica le immagini

Carica questi file dentro una cartella del bucket chiamata:

```txt
inbolla-campagna-geometri
```

File da caricare:

```txt
assets/inbolla-logo-full.png
assets/hero-cliente-reale.png
```

Il file `inbolla-mascot.png` e `demo-cruscotto.png` restano nella cartella asset locale, ma al momento non sono usati nel template Mailchimp aggiornato.

## 3. Recupera il project ref Supabase

Dal tuo URL Supabase:

```txt
https://xxxxxxxxxxxxxxxxxxxx.supabase.co
```

il project ref e':

```txt
xxxxxxxxxxxxxxxxxxxx
```

## 4. Modifica l'HTML Mailchimp

File preparato:

```txt
email_mailchimp_supabase.html
```

Dentro al file sostituisci:

```txt
YOUR_PROJECT_REF
```

con il project ref reale.

Esempio URL finale:

```txt
https://xxxxxxxxxxxxxxxxxxxx.supabase.co/storage/v1/object/public/email-assets/inbolla-campagna-geometri/inbolla-logo-full.png
```

## 5. Test

Apri gli URL delle immagini in una finestra anonima del browser. Se si vedono senza login, Mailchimp riuscira' a mostrarle.

Poi in Mailchimp:

1. Crea campagna.
2. Scegli template/code your own/import HTML.
3. Incolla il contenuto di `email_mailchimp_supabase.html`.
4. Invia una mail di test.

## Merge tag Mailchimp

Nel template Mailchimp il cognome usa:

```txt
*|LNAME|*
```

Quando importi il CSV, assicurati che la colonna `LASTNAME` venga mappata come cognome/last name.
