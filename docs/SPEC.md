# SPEC — Anime Tracker v1

**Stato:** approvata

## Obiettivo

Un tracker personale di anime basato sull'API GraphQL pubblica di AniList. È un progetto-esercizio per il portfolio: conta la qualità dell'esecuzione, non il numero di funzioni.

## Ambito della v1

- **Solo anime.** I manga sono rimandati a una versione successiva.
- **Nessun login.** La lista personale vive nel browser (ADR-0002).

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

### 4. La mia lista

Gli anime salvati, filtrabili per stato. Per ogni voce si modificano stato, episodi visti, voto e note.

### 5. Calendario della settimana

- Mostra gli episodi in uscita nella settimana, con copertina, titolo, numero dell'episodio e orario.
- Di base mostra **tutti gli anime in onda**; un filtro mostra **solo quelli della mia lista**.
- Si apre sulla **settimana corrente** e permette di andare **avanti** alle settimane successive, senza limite. Non si torna indietro.
- **Orari:** AniList fornisce l'orario di messa in onda in Giappone. L'app lo converte nel fuso del browser e lo indica come "messa in onda in Giappone", perché le piattaforme di streaming possono pubblicare l'episodio più tardi.
- **Layout:** su desktop 7 colonne, una per giorno; su mobile un elenco giorno per giorno che parte da oggi.

### 6. Statistiche

Calcolate nel browser a partire dalla lista personale, senza richieste all'API.

- **Numeri chiave:** anime per stato, episodi visti, ore guardate (episodi visti × durata di un episodio), voto medio.
- **Generi più visti:** grafico a barre.
- **Distribuzione dei voti:** da 1 a 10.
- **Studi più presenti:** i primi 5.

## La lista personale

### Stati

Gli stessi di AniList, per permettere in futuro una sincronizzazione senza conversioni.

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
- **Copia ridotta dei dati dell'anime** (titolo, copertina, numero e durata degli episodi, generi, studi), salvata quando l'anime viene aggiunto. Serve alle statistiche e alla lista senza richieste all'API. Si aggiorna quando si apre il dettaglio dell'anime (ADR-0002).

### Regole automatiche

- Al primo passaggio a "Sto guardando" si compila la data di inizio, se vuota.
- Al passaggio a "Completato" si compila la data di fine e gli episodi visti diventano il totale degli episodi.

## Fuori dalla v1

- Manga
- Login e sincronizzazione con AniList
- Funzioni social
- Notifiche
- Raccomandazioni
- Wrapped annuale (milestone successiva, basata sulle statistiche)

## Requisiti trasversali

- Interfaccia in italiano.
- Attribuzione ad AniList, con link, su ogni pagina.
- Rispetto dei limiti dell'API secondo ADR-0003.
- Accessibilità secondo gli standard del brain.
