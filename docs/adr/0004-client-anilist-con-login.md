# ADR-0004 — Client complementare di AniList, con login OAuth

**Stato:** accettato
**Data:** 2026-11-19
**Sostituisce:** [ADR-0002](0002-lista-nel-browser.md)

## Contesto

I [termini d'uso dell'API di AniList](https://docs.anilist.co/guide/terms-of-use), letti il 2026-11-19, vietano l'uso dell'API in "competing, non-complementary services of the same nature", e il divieto comprende esplicitamente "anime and manga list or tracker services". Vale per tutti i dati dell'API, compresi quelli degli anime. Vietano anche l'uso dell'API "as a backup or data storage service".

ADR-0002 prevedeva una lista personale salvata nel browser, con una copia ridotta dei dati di ogni anime: un tracker concorrente, quindi vietato. L'app deve diventare un **client complementare**: la lista vive su AniList e l'app la mostra e la modifica.

I termini non chiedono una formula precisa di attribuzione. Le regole sui nomi valgono solo se il nome contiene "AniList", e "Anime Tracker" non lo contiene.

Dalla documentazione ufficiale ([autenticazione](https://docs.anilist.co/guide/auth/), [Authorization Code Grant](https://docs.anilist.co/guide/auth/authorization-code), [limiti di richieste](https://docs.anilist.co/guide/rate-limiting)), letta il 2026-11-19:

- AniList usa OAuth2 e supporta sia l'Authorization Code Grant sia l'Implicit Grant.
- **Non ci sono scope**: un token dà accesso quasi completo ai dati dell'utente. Il token **dura 1 anno** e **non esistono refresh token**.
- **Senza login** si leggono i dati degli anime e i dati degli utenti pubblici e non elencati. **Con login** si modificano le liste, si leggono i dati degli utenti privati (solo per l'utente collegato) e i campi legati all'utente, come `Media.mediaListEntry`.
- Flusso: redirect a `https://anilist.co/api/v2/oauth/authorize` con `client_id`, `redirect_uri` e `response_type=code`; AniList rimanda al `redirect_uri` con un parametro `code`; il server lo scambia con una `POST` a `https://anilist.co/api/v2/oauth/token`, con `grant_type`, `client_id`, `client_secret`, `redirect_uri` e `code`. Il `redirect_uri` deve coincidere esattamente con quello registrato nell'applicazione AniList.
- **Limite di richieste:** 90 al minuto, oggi ridotto a 30, più un limite sui picchi; oltre il limite, risposta 429 con `Retry-After`. Al momento AniList non accetta richieste di aumento. La documentazione **non dice** se il limite vale per indirizzo IP, per token o per applicazione. Dice però che "per le applicazioni che girano su un server" il limite può essere troppo restrittivo, e questo fa pensare che tutte le richieste del nostro server condividano un unico limite.

Verificato nello schema (`schema/anilist.graphql`):

- lettura di una lista: `MediaListCollection(userId, userName, type, status, …)`;
- utente collegato: `Viewer: User`;
- modifica di una voce: `SaveMediaListEntry(id, mediaId, status, score, scoreRaw, progress, private, notes, startedAt, completedAt, …)`, dove `scoreRaw` è il voto su 100 punti indipendente dal sistema di voto scelto dall'utente;
- eliminazione di una voce: `DeleteMediaListEntry(id)`;
- lettura del voto in un formato fisso: `MediaList.score(format: ScoreFormat)`, con `POINT_10` = intero da 0 a 10 e `POINT_10_DECIMAL` = numero da 0 a 10 con un decimale.

## Decisione

### 1. Ruolo dell'app

Anime Tracker è un **client non ufficiale e complementare** di AniList. La lista di ogni utente esiste solo sul suo account AniList. L'app non ne conserva copie, né sul server né nel browser, oltre alla cache temporanea delle risposte descritta sotto.

Ogni pagina lo dichiara nel footer: "Anime Tracker è un client non ufficiale per AniList, non affiliato ad AniList. Dati forniti da AniList." con link ad anilist.co. La stessa dichiarazione compare accanto al pulsante di accesso.

### 2. Login: Authorization Code Grant gestito dal server Next.js

- **Avvio** (`GET /api/auth/login`): il server genera un valore casuale `state`, lo salva in un cookie temporaneo (httpOnly, Secure, SameSite=Lax, 10 minuti) e reindirizza all'URL di autorizzazione di AniList con `client_id`, `redirect_uri`, `response_type=code` e `state`.
- **Ritorno** (`GET /api/auth/callback`): il server verifica che `state` coincida con il cookie e lo cancella; scambia `code` con il token facendo la `POST` a `/oauth/token` con il client secret; salva il token nel cookie di sessione; reindirizza alla pagina di partenza (solo percorsi interni all'app). Se l'utente nega l'accesso o la verifica fallisce, reindirizza con un messaggio in italiano, senza dettagli tecnici.
- **Variabili d'ambiente**, solo lato server: `ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET`, `ANILIST_REDIRECT_URI`. Il secret non ha mai il prefisso `NEXT_PUBLIC_`, non compare nel repository, nei log o nei messaggi d'errore, e su Vercel è una variabile d'ambiente del progetto.
- **Cookie di sessione:** contiene il token così come lo rilascia AniList; nome con prefisso `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, senza `Domain`, durata 30 giorni (più breve del token, che dura 1 anno). Il prefisso obbliga il browser a rifiutare il cookie se manca una di queste condizioni, e impedisce che un altro sottodominio lo imposti o lo sovrascriva. Il JavaScript della pagina non lo legge mai; non compare in URL, log o risposte al browser.
- **Sviluppo in locale:** il prefisso `__Host-` richiede `Secure`. Secondo MDN ([Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie), [Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies), letti il 2026-11-19) i browser accettano `Secure` anche da `http://localhost`, ma Safari no. Provato il 2026-11-19 con un server su `http://localhost` che imposta `__Host-session=ok; Secure; HttpOnly; Path=/; SameSite=Lax`: Chrome 158 lo salva e lo rimanda, Safari 26.5 lo rifiuta. Con `npm run dev` il login si prova quindi in Chrome; per provarlo in Safari serve HTTPS in locale con `next dev --experimental-https`, documentato nella CLI di Next.js 16.4.6, che genera un certificato con `mkcert`.
- **Logout** (`POST /api/auth/logout`): cancella il cookie e svuota la cache di TanStack Query nel browser, così nella pagina non restano i dati dell'utente appena uscito. La documentazione non descrive un modo per revocare il token via API: la pagina di logout spiega che l'accesso si può revocare anche dalle impostazioni dell'account AniList.
- **Protezione CSRF:** ogni azione che usa il token e modifica qualcosa è una `POST` (Server Action o Route Handler), mai una `GET`. `SameSite=Lax` impedisce di inviare il cookie con le `POST` provenienti da altri siti; in più si verifica l'intestazione `Origin`.
- **Ambienti:** il `redirect_uri` deve coincidere esattamente, quindi servono due applicazioni AniList: una per lo sviluppo (`http://localhost:3000/api/auth/callback`) e una per la produzione. Nelle anteprime di Vercel, che hanno un indirizzo diverso a ogni deploy, il login non è disponibile e la pagina lo dice.

### 3. Richieste autenticate e limite di richieste

- Le richieste con il token passano **sempre dal nostro server**, perché il browser non ha accesso al token.
- **Ipotesi prudente:** tutte le richieste del nostro server, autenticate e non, condividono un unico limite. Il server deve quindi farne il meno possibile:
  - **le pagine condivise restano condivise:** Home, Dettaglio e Calendario si generano senza dati dell'utente e restano in cache come in ADR-0003. Le parti personali (quali anime sono già nella lista, la voce dell'utente nel Dettaglio) si caricano dal browser con una richiesta separata al nostro server. `Media.mediaListEntry` non si usa nelle query condivise;
  - **la lista dell'utente** si legge con una sola richiesta (`MediaListCollection` per l'utente collegato, con i campi degli anime che servono a lista e statistiche). Il server non la mette in cache (`no-store`), così i dati di utenti diversi non possono mai mescolarsi. Nel browser la tiene TanStack Query per tutta la sessione e la aggiorna dopo ogni modifica;
  - **la cache di TanStack Query resta solo in memoria:** nessun plugin di persistenza (`localStorage`, IndexedDB o altro). Salvarla sarebbe una copia locale della lista, vietata dai termini d'uso. Chiusa la pagina, i dati si rileggono da AniList;
  - **le modifiche** sono una `SaveMediaListEntry` per azione, con aggiornamento immediato dell'interfaccia. Se una modifica fallisce, l'interfaccia torna allo stato precedente e mostra un messaggio. I clic ripetuti sugli episodi visti si raggruppano in una sola richiesta, dopo 800ms senza altri clic. Se la pagina viene nascosta o chiusa (`visibilitychange` verso `hidden`, `pagehide`) mentre una modifica è in attesa, la modifica si invia subito, senza aspettare gli 800ms;
  - **si invia solo il campo cambiato:** in particolare il voto, che si scrive come `scoreRaw` = voto × 10 solo se l'utente lo ha modificato, così non si perde la precisione di chi usa un sistema di voto più fine.
- **Errori 429:** valgono le regole di ADR-0003 per il browser (messaggio con il tempo di attesa, al massimo un nuovo tentativo).

### 4. Senza login

- **Home, Ricerca, Dettaglio e Calendario** funzionano per intero.
  - Il pulsante "+" delle card spiega che serve l'accesso e porta al login.
  - Il filtro "solo la mia lista" del Calendario usa la lista pubblica del profilo demo, con l'avviso, come "Cosa guardo stasera?" (modifica del 2026-11-20, M5: prima era disattivato con la spiegazione "Accedi con AniList per filtrare la tua lista").
- **La mia lista e Statistiche: modalità demo in sola lettura**, con la lista pubblica del profilo indicato in `ANILIST_DEMO_USERNAME`. È una variabile d'ambiente del server, non segreta: deve essere un profilo pubblico del proprietario del progetto. Oggi è `yvr1x0202`, un account creato apposta per la demo; la sua lista risulta pubblica sia in una finestra anonima sia con una richiesta senza token, verificate il 2026-11-19.
  - Lettura senza token: `MediaListCollection(userName: …, type: ANIME)`. La documentazione conferma che i dati degli utenti pubblici si leggono senza autenticazione.
  - Questi dati sono uguali per tutti, quindi si tengono in cache sul server per 1 ora, come gli altri dati pubblici (ADR-0003).
  - Un avviso in cima alla pagina: "Modalità demo: lista pubblica di {nome} su AniList, in sola lettura. Accedi con AniList per vedere e modificare la tua." I controlli di modifica non compaiono.
  - Se il profilo demo non esiste o non è pubblico: messaggio in italiano al posto della lista, non una pagina d'errore.

### 5. La lista

- Gli stati restano quelli di AniList (`CURRENT`, `PLANNING`, `COMPLETED`, `PAUSED`, `DROPPED`, `REPEATING`) con le etichette italiane della SPEC.
- **Lettura:** `status`, `progress`, voto con `score(format: POINT_10_DECIMAL)` (modifica del 2026-11-20, prima `POINT_10`), `notes`, `startedAt`, `completedAt`, più i dati dell'anime che servono a lista e statistiche (titoli, copertina, numero e durata degli episodi, generi, studi), letti ogni volta da AniList.
- **Scrittura:** `SaveMediaListEntry`. Le regole automatiche della SPEC (data di inizio, data di fine, episodi al completamento) le applica l'app nella stessa richiesta.
- **Eliminazione:** `DeleteMediaListEntry(id)`, dopo una conferma.
- Le voci private dell'utente le vede solo lui; nella modalità demo AniList non le restituisce.

### 6. Dati personali

Non c'è un database. Il server non salva niente: il token sta solo nel cookie dell'utente; né il token né il contenuto delle liste finiscono nei log. Il cookie è tecnico e serve solo al login.

### 7. Decisioni dell'implementazione (M2, 2026-11-20)

- **Applicazioni AniList:** sviluppo con `http://localhost:3000/api/auth/callback`, produzione con `https://anime-tracker-three.vercel.app/api/auth/callback`. Le applicazioni AniList non si possono cancellare.
- **Indirizzi di AniList configurabili, solo per i test:** `ANILIST_OAUTH_URL` (predefinito `https://anilist.co/api/v2/oauth`) si aggiunge ad `ANILIST_API_URL` (predefinito `https://graphql.anilist.co`), così i test e2e usano un finto AniList anche per il login. **Su Vercel, anteprime comprese, sono ammessi solo gli indirizzi veri:** con un altro valore la build si ferma e il server non parte. In locale restano liberi, perché i test usano la build di produzione con il finto AniList.
- **Nome nell'header:** al login il server legge una volta `Viewer` (id e nome) e lo salva in un secondo cookie, leggibile dal JavaScript, solo per mostrare il nome. Le pagine condivise non leggono i cookie, così restano in cache. Tre condizioni:
  1. non si usa mai per decidere l'accesso: ogni richiesta personale passa dal server, che guarda solo il cookie del token;
  2. ha la stessa durata del cookie di sessione (30 giorni) e si cancella insieme a lui al logout;
  3. si cancella insieme al cookie di sessione quando AniList risponde 401 (token scaduto o revocato).
- **Id dell'utente per leggere la lista:** `MediaListCollection` vuole `userId` o `userName`. Il server lo prende da un terzo cookie, `__Host-session-user` (`HttpOnly`, solo l'id), scritto al login insieme al token e cancellato con lui, con la stessa durata. Il cookie del token resta il token così come lo rilascia AniList, e il cookie del nome non decide niente. Un id modificato a mano non apre niente: AniList applica comunque i permessi del token.
- **Token non più valido:** AniList risponde **400 "Invalid token"**, non 401 (verificato il 2026-11-20 con un token inventato). Il server tratta come sessione finita sia questa risposta sia un 401: risponde 401 al browser e cancella tutti i cookie di sessione, e La mia lista chiede di accedere di nuovo.
- **Prove manuali con l'account demo `yvr1x0202`.** Regole: si usano solo anime che non sono già nella lista e alla fine si cancellano; le voci esistenti non si modificano mai. Prima delle prove si elencano le voci attuali, dopo si verifica che siano identiche.
- **Controllo del secret:** `scripts/check-secret.mjs` cerca il client secret di `.env.local` nei file tracciati da git e nella cronologia, e stampa solo se lo ha trovato, mai il valore.

### 8. Verifiche dell'implementazione (M2, 2026-11-20)

Prove reali con l'applicazione di sviluppo e l'account demo `yvr1x0202`, sull'anime di prova Frieren, assente dalla lista e cancellato alla fine. Le 84 voci della lista sono risultate identiche prima e dopo, compreso `updatedAt`.

- **`state`:** AniList lo rimanda al `redirect_uri` insieme a `code`. Il controllo di `state` funziona e il rischio di login forzato non resta aperto.
- **Date automatiche:** al passaggio a "Sto guardando" AniList **non** compila la data di inizio, quindi la regola della SPEC serve. Al passaggio a "Completato" AniList compila da sé la data di fine e porta gli episodi al totale: la nostra regola invia gli stessi valori, quindi applicarla due volte non cambia niente (la data è quella del fuso del browser).
- **Completamento automatico:** quando gli episodi visti arrivano al totale, AniList porta da sé lo stato a "Completato". L'interfaccia lo mostra, perché sostituisce la voce con la risposta di AniList.
- **Focus quando una card esce da La mia lista (M8, 2026-11-24):** fino a M7 si decideva prima della risposta, con una previsione (`savedStatusAndScore`) che supponeva il completamento automatico solo da "Sto guardando" e un voto uguale a quello inviato. Ora la lista reagisce all'uscita reale della card, dopo l'aggiornamento ottimistico o dopo la risposta di AniList, e annuncia lo stato e il voto che la voce ha davvero; se la card esce in ritardo, il focus si sposta solo se è ancora dentro quella card. Restano quindi **non verificati, e non più necessari**: se AniList completa da sé anche da "In rewatch", "In pausa", "Droppato" o "Da vedere", e come arrotonda `scoreRaw` per chi usa un sistema di voto diverso (5 stelle, 3 faccine, 100 punti). Il codice non dipende più da questi comportamenti: qualunque cosa risponda AniList, la card esce o resta secondo la risposta. Nessuna prova sul vero AniList (decisione del 2026-11-24).
- **`score(format: POINT_10)` tronca, non arrotonda:** 85/100 e 89/100 diventano 8, 95/100 diventa 9. **Decisione del 2026-11-20:** il voto si legge con `POINT_10_DECIMAL` (89/100 → 8,9), si mostra con un decimale e si modifica da 1,0 a 10,0 con un decimale, scrivendo `scoreRaw` = voto × 10 (arrotondato all'intero, per gli errori di virgola mobile). Si invia solo se l'utente lo cambia.
- **Limite di richieste per IP:** con un token e senza, dallo stesso indirizzo, `X-RateLimit-Remaining` scende dello stesso contatore (29 → 27 e 26 → 24 con una richiesta autenticata e una di controllo in mezzo). Tutte le richieste del nostro server, anche di utenti diversi, condividono quindi un solo limite: l'ipotesi prudente del punto 3 è confermata.
- **Revoca:** su AniList, Impostazioni → Apps (`https://anilist.co/settings/apps`) elenca le applicazioni autorizzate, ciascuna con "Revoke App". La documentazione non descrive una revoca via API. La pagina di accesso e quella di uscita linkano le impostazioni.
- **Modifica inviata alla chiusura della pagina:** `fetch` con `keepalive` porta il cookie di sessione e un `Origin` valido. Provato con Playwright: una modifica lasciata in attesa arriva al server anche se si cambia pagina subito.
- **`Origin`:** le modifiche sono Route Handler in `POST`, non Server Actions; il controllo dell'`Origin` è nel nostro codice (`isSameOrigin`), provato con Playwright con un `Origin` estraneo e senza sessione.

## Alternative considerate

- **Implicit Grant**, con il token nel browser: senza server, ma il token (valido 1 anno, con accesso quasi completo) sarebbe leggibile da JavaScript e quindi esposto a un attacco XSS. Scartato.
- **Lista nel browser** (ADR-0002): vietata dai termini d'uso.
- **Chiedere un permesso scritto ad AniList:** tempi e risultato incerti. Si può fare in futuro, ma non sostituisce questa decisione.
- **Un'altra fonte di dati** (Kitsu, MyAnimeList tramite Jikan): cambierebbe stack, query e tipi generati. Scartato.
- **Database nostro, con sessioni lato server:** terrebbe più dati personali di quanto serve, e senza bisogno. Scartato.
- **Cache della lista sul server, per utente:** meno richieste ad AniList, ma con il rischio di mostrare i dati di un utente a un altro e con più codice. Scartato a favore della cache nel browser.

## Conseguenze

- **ADR-0002 è sostituito:** niente `localStorage`, niente Zustand con `persist`, niente backup JSON, niente copia locale dei dati degli anime.
- **Zustand non serve più:** lo stato della lista è stato del server, gestito con TanStack Query, già previsto in ADR-0001.
- Il server Next.js gestisce anche il login (Route Handler o Server Action). Il progetto resta senza database; su Vercel servono le variabili d'ambiente.
- Gli utenti collegati aggiungono richieste al limite condiviso: le misure del punto 3 lo contengono, ma con molti utenti contemporanei il limite resta un vincolo reale.
- Il login funziona solo in locale e in produzione.
- Le statistiche richiedono una richiesta ad AniList (prima erano calcolate su dati locali).
- Vanno aggiornati SPEC, `CLAUDE.md` e le milestone.

## Da verificare all'implementazione (M2)

**Stato:** tutte verificate in M2 (§8, 2026-11-20). Solo l'arrotondamento per i sistemi di voto diversi da quelli provati è chiuso senza prova in M8, perché il codice non ne dipende più (§8, "Focus quando una card esce da La mia lista").

- Che l'autorizzazione di AniList restituisca il parametro `state`: la documentazione non lo cita. Se non lo restituisce, si documenta il rischio residuo (un attaccante potrebbe collegare la vittima al proprio account AniList) e le contromisure possibili.
- Come Next.js 16.4 verifica l'`Origin` nelle Server Actions, nella documentazione inclusa nel pacchetto.
- Come inviare la modifica in attesa alla chiusura della pagina in modo che arrivi al server anche se la pagina non c'è più (per esempio `fetch` con `keepalive` verso un Route Handler in `POST`), e che la richiesta porti il cookie di sessione e un `Origin` valido.
- Se esiste un modo documentato per revocare il token, e dove si trova la gestione delle applicazioni nelle impostazioni di AniList.
- Se AniList compila da sé `startedAt` e `completedAt` al cambio di stato, per non applicare le regole due volte.
- Se il limite di richieste vale per IP o per token, osservando le intestazioni `X-RateLimit-*`.
- Come `score(format: POINT_10)` arrotonda i voti degli utenti con sistemi di voto più fini.
