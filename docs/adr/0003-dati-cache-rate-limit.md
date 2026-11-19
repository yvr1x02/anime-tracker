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

Il meccanismo di cache di Next.js si sceglie in M0 sulla versione installata; qui sono fissate solo le durate.

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
| Pagina servita con dati in cache scaduti | "Dati aggiornati alle {ora}: AniList al momento non risponde." |
| Pagina senza dati in cache e AniList non raggiungibile | "Non riesco a caricare i dati da AniList. Riprova tra qualche minuto." |

## Alternative considerate

- **Tutto dal server.** Cache condivisa anche per la ricerca, ma ogni ricerca di ogni visitatore consumerebbe il limite comune. Scartato.
- **Tutto dal browser.** Ogni visitatore con il proprio limite, ma nessuna cache condivisa e pagine non indicizzabili. Scartato.
- **Ricerca a ogni tasto premuto.** Scartato: spreca richieste e il `CLAUDE.md` lo vieta.

## Conseguenze

- In M1 va verificato che AniList accetti richieste dirette dal browser (CORS). Se non le accetta, la ricerca passa da una route del nostro server, con la sua cache: questa modifica va registrata aggiornando questo ADR.
- I dati di Home, Dettaglio e Calendario possono essere vecchi fino alla durata della loro cache.
- Gli orari nei messaggi si mostrano nel fuso del browser.
