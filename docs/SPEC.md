# SPEC — Anime Tracker v1

**Stato:** approvata

## Obiettivo

Un client non ufficiale e complementare di AniList per seguire i propri anime, basato sulla sua API GraphQL. È un progetto-esercizio per il portfolio: conta la qualità dell'esecuzione, non il numero di funzioni.

## Ambito della v1

- **Solo anime.** I manga sono rimandati a una versione successiva.
- **Login con AniList, facoltativo.** La lista personale è quella dell'account AniList dell'utente: l'app la mostra e la modifica, senza conservarne copie (ADR-0004).

## Con e senza login

- **Senza login** Home, Ricerca, Dettaglio e Calendario funzionano per intero.
  - Il pulsante "+" delle card spiega che serve l'accesso e porta al login.
  - Il filtro "solo la mia lista" del Calendario è disattivato, con la spiegazione "Accedi con AniList per filtrare la tua lista".
  - La mia lista e Statistiche sono in **modalità demo**: mostrano in sola lettura la lista pubblica di un profilo AniList dimostrativo, con l'avviso "Modalità demo: lista pubblica di {nome} su AniList, in sola lettura. Accedi con AniList per vedere e modificare la tua." I controlli di modifica non compaiono. Se il profilo demo non è disponibile, al posto della lista compare un messaggio.
- **Con login** si aggiungono, modificano e rimuovono le voci della propria lista AniList.
- **Uscita:** il logout chiude la sessione nell'app; la pagina spiega che l'accesso si può revocare anche dalle impostazioni dell'account AniList.

## Schermate

### 1. Home

Gli anime della stagione in corso, ordinati per popolarità. La stagione si calcola dalla data corrente: inverno gennaio–marzo, primavera aprile–giugno, estate luglio–settembre, autunno ottobre–dicembre.

Dalle card si può aggiungere un anime alla lista.

### 2. Ricerca

Ricerca degli anime per titolo, senza filtri aggiuntivi nella v1. Dalle card dei risultati si può aggiungere un anime alla lista.

- **Titoli cercabili:** giapponese traslitterato (romaji) e inglese, cioè i titoli che AniList fornisce.
- **Titoli italiani:** AniList non ha un campo per il titolo italiano. La ricerca lo trova quando coincide con il romaji o con l'inglese, o se compare tra i sinonimi. In M1 si verifica con prove reali se la ricerca considera i sinonimi.
- La pagina suggerisce di cercare in romaji o in inglese quando il titolo italiano non dà risultati.

### 3. Dettaglio

La scheda di un anime: copertina, titolo, trama, generi, studio, numero e durata degli episodi, stato di messa in onda, prossimo episodio in uscita. Da qui si aggiunge l'anime alla lista e se ne modifica la voce.

- **Prossimi episodi:** elenco dei prossimi episodi non ancora andati in onda (fino a 4), presi dal palinsesto di AniList, con numero, giorno e ora nel fuso del browser. Se non ci sono episodi in programma, la scheda lo dice.

### 4. La mia lista

Gli anime della lista AniList dell'utente, filtrabili per stato. Per ogni voce si modificano stato, episodi visti, voto e note; una voce si rimuove dopo una conferma. Senza login: modalità demo.

### 5. Calendario della settimana

- Mostra gli episodi in uscita nella settimana, con copertina, titolo, numero dell'episodio e orario.
- Di base mostra **tutti gli anime in onda**; un filtro mostra **solo quelli della mia lista**, disponibile solo con il login.
- Si apre sulla **settimana corrente** e permette di andare **avanti** alle settimane successive, senza limite. Non si torna indietro.
- **Orari:** AniList fornisce l'orario di messa in onda in Giappone. L'app lo converte nel fuso del browser e lo indica come "messa in onda in Giappone", perché le piattaforme di streaming possono pubblicare l'episodio più tardi.
- **Layout:** su desktop 7 colonne, una per giorno; su mobile un elenco giorno per giorno che parte da oggi.

### 6. Statistiche

Calcolate a partire dalla lista personale letta da AniList, con una sola richiesta (ADR-0004). Senza login: modalità demo.

- **Numeri chiave:** anime per stato, episodi visti, ore guardate (episodi visti × durata di un episodio), voto medio.
- **Generi più visti:** grafico a barre.
- **Distribuzione dei voti:** da 1 a 10.
- **Studi più presenti:** i primi 5.

## La lista personale

### Stati

Quelli di AniList, dove la lista è salvata.

| Valore AniList | Etichetta nell'interfaccia |
|---|---|
| `CURRENT` | Sto guardando |
| `PLANNING` | Da vedere |
| `COMPLETED` | Completato |
| `PAUSED` | In pausa |
| `DROPPED` | Droppato |
| `REPEATING` | In rewatch |

### Dati di ogni voce

- **Stato**
- **Episodi visti**
- **Voto personale** da 1 a 10, facoltativo
- **Data di inizio e data di fine**, compilate in automatico al cambio di stato
- **Note personali**, facoltative

I dati dell'anime che servono a lista e statistiche (titolo, copertina, numero e durata degli episodi, generi, studi) si leggono da AniList insieme alla lista, ogni volta. L'app non conserva copie né della lista né dei dati degli anime, oltre alla cache temporanea delle risposte (ADR-0004).

### Regole automatiche

- Al primo passaggio a "Sto guardando" si compila la data di inizio, se vuota.
- Al passaggio a "Completato" si compila la data di fine e gli episodi visti diventano il totale degli episodi.

## Fuori dalla v1

- Manga
- Esportazione e backup della lista: la lista è su AniList, e i termini d'uso vietano di usare l'API come archivio di dati (ADR-0004)
- Funzioni social
- Notifiche
- Raccomandazioni
- Wrapped annuale (milestone successiva, basata sulle statistiche)

## Requisiti trasversali

- Interfaccia in italiano.
- Su ogni pagina, con link ad anilist.co: "Anime Tracker è un client non ufficiale per AniList, non affiliato ad AniList. Dati forniti da AniList." La stessa dichiarazione compare accanto al pulsante di accesso (ADR-0004).
- Rispetto dei limiti dell'API secondo ADR-0003.
- Accessibilità secondo gli standard del brain.
