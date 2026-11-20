# ADR-0003 — Richieste ad AniList, cache e limiti

**Stato:** accettato
**Data:** 2026-11-19

## Contesto

AniList limita le richieste per client. Oggi il limite è ridotto a 30 al minuto rispetto ai 90 abituali, e può cambiare senza preavviso.

Con Next.js (ADR-0001) le richieste possono partire dal server o dal browser:

- dal **server** condividono un unico limite per tutti i visitatori, ma il risultato si può tenere in cache e riusare;
- dal **browser** ogni visitatore usa il proprio limite, ma non c'è cache condivisa.

## Decisione

### Chi fa la richiesta

| Dato | Da dove | Cache sul server | Motivo |
|---|---|---|---|
| Home (stagione) | Server | 6 ore | Uguale per tutti e cambia poco |
| Dettaglio | Server | 1 ora | Uguale per tutti e indicizzabile; prossimo episodio e numero di episodi cambiano durante la stagione |
| Calendario | Server, per settimana | 1 ora | Uguale per tutti; gli orari possono essere spostati. Il filtro "solo la mia lista" si applica nel browser |
| Ricerca | Browser, direttamente ad AniList | — | Ogni ricerca è diversa; ogni visitatore usa il proprio limite |

### Meccanismo di cache (scelto in M0, 2026-11-19)

**Cache di `fetch` con `revalidate`, senza Cache Components.** Ogni richiesta del server ad AniList usa `cache: "force-cache"` e `next: { revalidate }` con la durata della tabella sopra (Home 21600 secondi, Dettaglio e Calendario 3600). `cacheComponents` e `partialPrefetching`, attivi nel template, sono tolti da `next.config.ts`.

Motivi, dalla documentazione di Next.js 16.4.6 inclusa nel pacchetto:

- con la cache di `fetch` (ISR), se l'aggiornamento fallisce "the last successfully generated data will continue to be served"; per Cache Components la documentazione non lo dice;
- la cache di `fetch` sopravvive ai deploy, mentre quella di `'use cache'` no, perché la sua chiave contiene l'identificativo della build; inoltre, su un hosting serverless come Vercel, la cache in memoria di `'use cache'` di solito non dura tra una richiesta e l'altra;
- la cache di `fetch` vale anche per le richieste `POST` di GraphQL: la chiave comprende il corpo della richiesta.

**Prova locale del 2026-11-19** (`next build` e `next start`, finto AniList su localhost che risponde 200 o 429, `revalidate` di 10 secondi, una pagina di prova poi cancellata):

| Caso | Cache Components (`'use cache'` + `cacheLife`) | `fetch` + `revalidate` |
|---|---|---|
| Visite entro la durata della cache | Dati in cache, nessuna richiesta | Uguale |
| Cache scaduta, AniList risponde | Prima visita: dati vecchi, aggiornamento in sottofondo; visita dopo: dati nuovi. Nessun errore | Uguale |
| Cache scaduta, AniList risponde 429 | Dati vecchi con stato 200, nessuna pagina d'errore; un solo tentativo per finestra di `revalidate`, non a ogni visita | Uguale |
| AniList torna a rispondere | Alla finestra successiva i dati si aggiornano | Uguale |
| Nuova build con AniList in 429 | Build riuscita, ma la pagina torna ai dati della **prima** build, più vecchi di quelli serviti prima | Build riuscita, la pagina mostra **gli ultimi dati** scaricati |
| Build senza dati in cache, AniList in 429 | — | La build si ferma con un errore: non si pubblica una pagina vuota |

La prova gira su `next start`, che tiene la cache su disco. **Da verificare su Vercel in M1**, con la prima query vera: dati vecchi durante un 429 e cache che sopravvive a un nuovo deploy.

**Conseguenze della scelta:** si rinuncia al Partial Prefetching, che richiede Cache Components. Le parti personali delle pagine (ADR-0004) si caricano comunque dal browser.

### Dettaglio di id inesistenti (verificato in M1, 2026-11-19)

Ogni pagina del Dettaglio si genera alla prima visita (`generateStaticParams` vuoto). Il rischio: chiunque visiti molti id diversi fa partire una richiesta ad AniList per ciascuno e consuma il limite comune.

- **Id non validi** (non interi positivi, oppure oltre il massimo di `Int` in GraphQL): 404 subito, senza richieste ad AniList.
- **Id validi ma inesistenti, o di anime per adulti:** prova locale con la build di produzione e un finto AniList che risponde sempre "Not Found" e conta le richieste. Tre visite a `/anime/2` hanno fatto **una sola** richiesta; un altro id ne ha fatta una in più, poi nessuna. Anche la 404 resta in cache, come pagina generata: la cache di `fetch` era vuota.
- **Rischio che resta:** un id nuovo costa sempre una richiesta. Non ho verificato quanto dura in cache una 404, né il comportamento su Vercel. Le contromisure verso i bot (per esempio `robots.txt`) si valutano in M6.

### Ricerca

- La richiesta parte dopo **400 ms** senza digitazione e solo con almeno **3 caratteri**.
- TanStack Query tiene in memoria i risultati delle ricerche già fatte.

### Errore 429 (troppe richieste)

- **Server:** si servono gli ultimi dati in cache, anche se scaduti, invece di una pagina d'errore.
- **Browser:** si mostra un messaggio con il tempo di attesa indicato da AniList e si fa **al massimo un** nuovo tentativo automatico dopo quell'attesa.
- Mai tentativi ripetuti a raffica, mai polling.

### Messaggi all'utente

| Situazione | Messaggio |
|---|---|
| Ricerca bloccata dal limite | "AniList sta ricevendo troppe richieste. Riprovo tra {secondi} secondi." |
| Ricerca fallita anche dopo il nuovo tentativo | "Non riesco a raggiungere AniList in questo momento. Riprova tra qualche minuto." |
| Pagina con dati più vecchi della durata della loro cache | "Dati aggiornati alle {ora}." |
| Pagina senza dati in cache e AniList non raggiungibile | "Non riesco a caricare i dati da AniList. Riprova tra qualche minuto." |

**Modifica del 2026-11-19 (M0).** La riga dei dati vecchi diceva "Dati aggiornati alle {ora}: AniList al momento non risponde." Ma con lo stale-while-revalidate dati più vecchi della durata della cache sono normali: per esempio, il primo visitatore dopo un periodo senza visite. Quindi:

- dati più vecchi della durata della loro cache: solo "Dati aggiornati alle {ora}.", in tono neutro;
- "AniList al momento non risponde" e gli altri messaggi d'errore compaiono solo quando una richiesta fallisce davvero, mai dedotti dall'età dei dati.

Con la cache di `fetch`, un aggiornamento fallito sul server non arriva alla pagina: il visitatore riceve la versione precedente, al massimo con il messaggio neutro. I messaggi d'errore riguardano quindi le richieste dal browser (Ricerca, parti personali) e le pagine senza dati in cache. Da verificare in M1: l'ora dei dati deve essere quella del download, non quella della generazione della pagina, per esempio dall'intestazione `Date` della risposta, che resta in cache insieme ai dati.

**Implementazione in M1 (2026-11-20).**

- **Ora dei dati:** è l'intestazione `Date` della risposta di AniList. Verificato che resta in cache con i dati: ogni voce di `.next/cache/fetch-cache` contiene `headers.date` accanto al corpo, quindi una pagina rigenerata dalla cache mostra l'ora del download, non quella della generazione.
- **Dove si calcola:** nel browser, perché anche l'HTML della pagina è in cache e l'ora del server al momento della generazione non dice niente sulla visita. Se i dati sono di un altro giorno si aggiunge la data: "Dati aggiornati al 17 nov alle 15:16.".
- **Pagina senza dati in cache:** `src/app/error.tsx` mostra "Non riesco a caricare i dati da AniList. Riprova tra qualche minuto." con il pulsante "Riprova". In produzione l'errore arriva al browser senza messaggio, quindi il testo non distingue le cause: AniList è l'unica fonte di dati delle pagine.

## Alternative considerate

- **Tutto dal server.** Cache condivisa anche per la ricerca, ma ogni ricerca di ogni visitatore consumerebbe il limite comune. Scartato.
- **Tutto dal browser.** Ogni visitatore con il proprio limite, ma nessuna cache condivisa e pagine non indicizzabili. Scartato.
- **Ricerca a ogni tasto premuto.** Scartato: spreca richieste e il `CLAUDE.md` lo vieta.

## Conseguenze

- In M1 va verificato che AniList accetti richieste dirette dal browser (CORS). Se non le accetta, la ricerca passa da una route del nostro server, con la sua cache: questa modifica va registrata aggiornando questo ADR.
- I dati di Home, Dettaglio e Calendario possono essere vecchi fino alla durata della loro cache.
- Gli orari nei messaggi si mostrano nel fuso del browser.
