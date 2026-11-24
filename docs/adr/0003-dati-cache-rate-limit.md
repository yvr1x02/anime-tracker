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
| Calendario | Server, per settimana, **una richiesta** (vedi "Calendario") | 1 ora | Uguale per tutti; gli orari possono essere spostati. Il filtro "solo la mia lista" si applica nel browser |
| Ricerca (pagina e ricerca rapida di M7) | Browser, direttamente ad AniList | — | Ogni ricerca è diversa; ogni visitatore usa il proprio limite |
| Striscia "in onda ora" della Home (M7) | Server, dalle settimane del Calendario: la corrente e, se le prossime 24 ore la superano, la successiva | 1 ora | Nessuna query nuova: le stesse voci della cache del Calendario. Al massimo una richiesta all'ora in più, per la settimana successiva, se nessuno la apre dal Calendario |
| Lista demo (La mia lista, Statistiche, "Cosa guardo stasera?" e il filtro del Calendario senza login, da M4) | Server; per "Cosa guardo stasera?" e il Calendario il browser la chiede a `/api/demo-list` quando serve | 1 ora | Uguale per tutti: tutte le pagine fanno la stessa richiesta e condividono la stessa voce della cache |

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

La prova gira su `next start`, che tiene la cache su disco. **Su Vercel, verificato in M2 (2026-11-20):** la cache di `fetch` sopravvive a un nuovo deploy (vedi "Verifica su Vercel"). Il comportamento durante un 429 non è stato provocato su Vercel, per non consumare il limite di AniList apposta: resta verificato solo in locale.

**Conseguenze della scelta:** si rinuncia al Partial Prefetching, che richiede Cache Components. Le parti personali delle pagine (ADR-0004) si caricano comunque dal browser.

### Dettaglio di id inesistenti (verificato in M1, 2026-11-19)

Ogni pagina del Dettaglio si genera alla prima visita (`generateStaticParams` vuoto). Il rischio: chiunque visiti molti id diversi fa partire una richiesta ad AniList per ciascuno e consuma il limite comune.

- **Id non validi** (non interi positivi, oppure oltre il massimo di `Int` in GraphQL): 404 subito, senza richieste ad AniList.
- **Id validi ma inesistenti, o di anime per adulti:** prova locale con la build di produzione e un finto AniList che risponde sempre "Not Found" e conta le richieste. Tre visite a `/anime/2` hanno fatto **una sola** richiesta; un altro id ne ha fatta una in più, poi nessuna. Anche la 404 resta in cache, come pagina generata: la cache di `fetch` era vuota.
- **Rischio che resta:** un id nuovo costa sempre una richiesta. Non ho verificato quanto dura in cache una 404, né il comportamento su Vercel.
- **`robots.txt` (M8, decisione del 2026-11-24):** vieta tutto (`User-Agent: *`, `Disallow: /`), perché il progetto è un esercizio per il portfolio e non ha bisogno di essere trovato dai motori di ricerca. È una **contromisura di cortesia**: la rispettano solo i bot che vogliono rispettarla, e non toglie dagli indici gli indirizzi che altri siti linkano. La protezione vera del limite di AniList restano la cache sul server (una richiesta per finestra di `revalidate`, anche con molte visite) e la gestione del 429 (dati vecchi invece di nuove richieste, messaggio con l'attesa). Con questa scelta si rinuncia all'indicizzazione dei Dettagli prevista da ADR-0001.

### Calendario (M5, 2026-11-20)

- **Una settimana, una richiesta.** `Page.airingSchedules` dà al massimo 50 episodi per pagina e una settimana ne ha circa 170 (misurato il 2026-11-20, con i margini dei fusi). Le pagine si chiedono **tutte nella stessa richiesta GraphQL**, con degli alias (`p1: Page(page: 1)` … `p6: Page(page: 6)`): 300 episodi di capienza, verificati su AniList in 0,45 secondi.
- **Mai una settimana a metà.** Una settimana si mostra e si mette in cache solo se è completa:
  - la risposta contiene tutte le pagine e nessun errore; un errore anche solo su una pagina (per esempio la terza) fa rifiutare tutta la risposta;
  - l'ultima pagina non dice che ce ne sono altre: se lo dicesse, la settimana sarebbe incompleta e conta come errore;
  - poiché la settimana è una sola voce della cache di `fetch`, una risposta rifiutata non si salva: si serve l'ultima versione completa in cache (stale-while-revalidate, vedi la prova di M0) oppure, se non c'è, la pagina d'errore. Con pagine in richieste separate, la cache avrebbe potuto mescolare pagine di momenti diversi.
- **Prova locale del 2026-11-20** (build di produzione, finto AniList, cache del calendario portata per la prova a 10 secondi): una settimana completa in cache, poi, scaduta la cache, una risposta che fallisce sulla terza pagina.

  | Guasto | Visite successive |
  |---|---|
  | Stato 500, con le prime due pagine nel corpo | Ultima versione completa (stessa ora dei dati); al primo aggiornamento riuscito, i dati nuovi |
  | Stato 429 | Uguale |
  | Stato 200 con un errore sulla terza pagina | La cache di `fetch` conserva ogni risposta 200 (codice di Next 16.4.6, `patch-fetch.js`): la risposta difettosa sostituisce quella completa e la settimana mostra la pagina d'errore fino alla scadenza successiva. Mai una settimana a metà, ma nemmeno l'ultima completa |

  Finora AniList ha sempre dato i suoi errori con lo stato HTTP corrispondente (400, 404, 429), quindi il terzo caso non è stato visto con AniList vero. Coprirlo richiederebbe di mettere in cache la settimana già validata (per esempio con `unstable_cache`), con una nuova prova: decisione aperta alla chiusura di M5.

  **Chiusa in M8 (decisione del 2026-11-24): non si corregge.** I log di produzione non sono leggibili da qui (il progetto su Vercel non sta nell'account collegato agli strumenti, e sul piano Hobby i log di runtime durano un'ora), quindi la chiusura si basa su ciò che è stato visto con AniList vero: la prova del 2026-11-20 qui sopra; la prova di M7 del 2026-11-24 (settimana del 23–29 novembre, 130 episodi, e il redirect da `?settimana=`); la fotografia della produzione del 2026-11-24, con le settimane del 23–29 novembre e del 30 novembre–6 dicembre complete (151 e 137 orari di uscita nei dati della pagina, nessuna pagina d'errore). In nessun caso AniList ha risposto 200 con un errore. Se succedesse, il danno resta quello della tabella: la pagina d'errore con "Riprova" per al massimo un'ora, mai una settimana a metà.
- **Finestra:** il server non conosce il fuso di chi guarda, quindi per la settimana che inizia lunedì D scarica dal lunedì D alle 00:00 UTC meno 14 ore al lunedì successivo più 12 ore: copre quella settimana in ogni fuso, da UTC−12 a UTC+14. Il browser tiene solo gli episodi della settimana nel suo fuso.
- **Settimane future:** al massimo 12 dopo quella corrente; il parametro della settimana è validato (una data di lunedì, non nel passato, entro il tetto) prima di chiamare AniList.
- **Da M7 il parametro è il giorno** (`?giorno=`): il server ne ricava il lunedì e lo valida con le stesse regole; cambiare giorno nella stessa settimana avviene nel browser, senza richieste. Per le copertine grandi la query chiede anche `coverImage.large`: la query cambia, quindi dopo il deploy ogni settimana si riscarica una volta.
- **Costo:** 1 richiesta all'ora per la settimana corrente, condivisa da tutti, più 1 all'ora per ogni settimana futura aperta da qualcuno.
- **Prova sui dati veri (2026-11-20, nel fuso di Roma, senza login):** settimana del 16–22 novembre con 120 episodi (da 8 a 31 al giorno), quella successiva con 132; nessun anime per adulti; "Solo la mia lista" sulla lista demo lascia l'unico anime della lista in onda quella settimana. Una richiesta per settimana, come previsto.

### Statistiche (M6, 2026-11-23)

- **Nessuna richiesta in più.** Le statistiche si calcolano dalla lista già letta: con il login quella della sessione (ADR-0004), senza login la lista demo in cache. Alla query della lista si aggiungono generi e studi, quindi dopo il deploy la lista demo si scarica una volta con la query nuova, poi torna a una richiesta all'ora.
- **Prova sui dati veri** (server di sviluppo, senza login, lista demo di 96 voci): 3830 episodi visti, 1527 ore, voto medio 8,8, 89 anime con un voto; primi generi Azione 76, Drammatico 46, Avventura 44; primi studi MAPPA 16, bones 13, Studio Pierrot 13. Una richiesta per la lista demo, più tre richieste a mano per capire gli studi (vedi SPEC, "Statistiche").

### Ricerca

- La richiesta parte dopo **400 ms** senza digitazione e solo con almeno **3 caratteri**.
- TanStack Query tiene in memoria i risultati delle ricerche già fatte.
- **Ricerca rapida (M7):** stesse regole, stessa query e stessa chiave della pagina (stesso numero di risultati per pagina, ne mostra i primi 8): "Tutti i risultati" apre la pagina senza una nuova richiesta.

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

### Verifiche di M1 (2026-11-20)

- **CORS:** AniList risponde alla richiesta preliminare con 204 e `access-control-allow-origin: *`, e permette `POST` con `Content-Type` e `Accept`. La ricerca parte quindi direttamente dal browser.
- **Intestazioni leggibili dal browser:** `access-control-expose-headers` comprende solo `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Content-Length` e `Content-Range`. `Retry-After` non è leggibile: nel browser il tempo d'attesa dopo un 429 si calcola da `X-RateLimit-Reset`. Il limite è ancora di 30 richieste al minuto (`x-ratelimit-limit: 30`).
- **Il 429 nel browser:** non provocato apposta, per non consumare il limite. Se AniList lo manda senza le intestazioni CORS, il browser vede un errore di rete: la Ricerca riprova una volta dopo 1 secondo, poi mostra "Non riesco a raggiungere AniList…". Se invece il tempo d'attesa è leggibile, mostra "Riprovo tra {secondi} secondi." e riprova una volta dopo quel tempo. Un 429 senza tempo d'attesa non si riprova. Tutti questi casi sono provati con Playwright su risposte simulate.
- **Titoli italiani:** la ricerca considera i sinonimi; risultati in SPEC ("Ricerca").
- **Ora dei dati:** l'intestazione `Date` resta nella cache di `fetch` (vedi "Implementazione in M1" sopra).
- **Cache su Vercel:** rimandata a M2, perché l'anteprima chiede l'accesso a Vercel (Deployment Protection) e non si legge da riga di comando.

### Verifica su Vercel (M2, 2026-11-20)

- **La cache sopravvive a un nuovo deploy.** Sull'anteprima del branch `m2`, `/anime/457` aveva i dati scaricati alle 10:40:48 UTC. Dopo un nuovo deploy dello stesso branch (10:55:49), la pagina, rigenerata dal deploy nuovo, mostrava ancora i dati delle 10:40:48: nessun nuovo download. Che rispondesse il deploy nuovo è stato controllato su una pagina cambiata in quel commit.
- **La documentazione di Vercel** (Data Cache, letta il 2026-11-20) lo conferma: cache persistente tra i deploy, separata tra produzione e anteprime, divisa per regione, e su Hobby e Pro condivisa da tutti i progetti del team.
- **Attenzione alla chiave della cache:** l'anteprima di `m1` e quella di `m2` non condividevano la voce di `/anime/457`, perché in M2 la richiesta ad AniList costruisce le intestazioni in un altro modo e Next le usa nella chiave. Un cambio a come si fa una richiesta ad AniList rende quindi "nuove" le voci in cache, che si riscaricano una volta.

## Alternative considerate

- **Tutto dal server.** Cache condivisa anche per la ricerca, ma ogni ricerca di ogni visitatore consumerebbe il limite comune. Scartato.
- **Tutto dal browser.** Ogni visitatore con il proprio limite, ma nessuna cache condivisa e pagine non indicizzabili. Scartato.
- **Ricerca a ogni tasto premuto.** Scartato: spreca richieste e il `CLAUDE.md` lo vieta.

## Conseguenze

- AniList accetta richieste dirette dal browser (CORS, verificato in M1): la ricerca resta nel browser.
- I dati di Home, Dettaglio e Calendario possono essere vecchi fino alla durata della loro cache.
- Gli orari nei messaggi si mostrano nel fuso del browser.
