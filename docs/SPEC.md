# SPEC — Anime Tracker v1

**Stato:** approvata

## Obiettivo

Un client non ufficiale e complementare di AniList per seguire i propri anime, basato sulla sua API GraphQL. È un progetto-esercizio per il portfolio: conta la qualità dell'esecuzione, non il numero di funzioni.

## Ambito della v1

- **Solo anime.** I manga sono rimandati a una versione successiva.
- **Niente anime per adulti.** Tutte le richieste ad AniList li escludono (`isAdult: false`): non compaiono in Ricerca, Home e Calendario, e il loro Dettaglio risponde con la pagina 404.
- **Login con AniList, facoltativo.** La lista personale è quella dell'account AniList dell'utente: l'app la mostra e la modifica, senza conservarne copie (ADR-0004).

## Con e senza login

- **Senza login** Home, Ricerca, Dettaglio e Calendario funzionano per intero, tranne la sezione personale "Continua a guardare" della Home, che non compare.
  - Il pulsante "+" delle card spiega che serve l'accesso e porta al login.
  - Il filtro "solo la mia lista" del Calendario è disattivato, con la spiegazione "Accedi con AniList per filtrare la tua lista".
  - La mia lista, Statistiche e "Cosa guardo stasera?" sono in **modalità demo**: mostrano in sola lettura la lista pubblica di un profilo AniList dimostrativo, con l'avviso "Modalità demo: lista pubblica di {nome} su AniList, in sola lettura. Accedi con AniList per vedere e modificare la tua." I controlli di modifica non compaiono. Se il profilo demo non è disponibile, al posto della lista compare un messaggio.
- **Con login** si aggiungono, modificano e rimuovono le voci della propria lista AniList.
- **Uscita:** il logout chiude la sessione nell'app; la pagina spiega che l'accesso si può revocare anche dalle impostazioni dell'account AniList.

## Schermate

### 1. Home

Gli anime della stagione in corso, ordinati per popolarità. La stagione si calcola dalla data corrente: inverno gennaio–marzo, primavera aprile–giugno, estate luglio–settembre, autunno ottobre–dicembre.

Dalle card si può aggiungere un anime alla lista.

- **Continua a guardare** (solo per chi è collegato): gli anime della propria lista con episodi già usciti e non ancora visti, con quanti ne mancano ("Sei indietro di 2 episodi").
  - **Episodi usciti, secondo AniList:** per un anime concluso o cancellato, il numero totale di episodi; per un anime in corso, il numero del prossimo episodio in programma meno uno (`Media.nextAiringEpisode`), contando come uscito anche il prossimo se il suo orario è già passato. Se AniList non dà né il prossimo episodio né il totale, l'anime non compare.
  - **Episodi arretrati** = episodi usciti − episodi visti, quando sono più di zero.
  - **Quali anime:** quelli in "Sto guardando" e in "In rewatch" (con l'etichetta "Rewatch" sulla card), dall'ultima modifica, al massimo 6.
  - **La frase dipende dallo stato dell'anime:** in corso, "Sei indietro di N episodi"; concluso o cancellato, "Ti mancano N episodi"; al singolare per un episodio ("Sei indietro di 1 episodio", "Ti manca 1 episodio").
  - Se non ci sono arretrati, la sezione non compare.
  - **In pari con "+1" o dalla modifica della voce** (episodi fino agli arretrati, o "Completato"): la card sparisce, il focus passa al titolo della card successiva (o al titolo della sezione, se era l'ultima) e un annuncio per i lettori di schermo dice "Sei in pari con {titolo}". Se era l'ultima, la sezione resta con "Sei in pari: nessun episodio arretrato." fino alla visita successiva.
  - Se la card sparisce per un altro motivo (un altro stato, o la voce eliminata), il focus si sposta allo stesso modo e l'annuncio dice "{titolo} non è più in Continua a guardare"; dopo l'ultima, "Nessun altro anime da continuare."
  - Si calcola dalla lista già letta per la sessione (ADR-0004): nessuna richiesta in più ad AniList.
  - Senza login la sezione non compare.

### 2. Ricerca

Ricerca degli anime per titolo, senza filtri aggiuntivi nella v1. Dalle card dei risultati si può aggiungere un anime alla lista.

- **Titoli cercabili:** giapponese traslitterato (romaji) e inglese, cioè i titoli che AniList fornisce.
- **Titoli italiani:** AniList non ha un campo per il titolo italiano. La ricerca lo trova quando coincide con il romaji o con l'inglese, o se compare tra i sinonimi. Verificato in M1 (2026-11-20) con tre ricerche reali: la ricerca considera i sinonimi, e "L'attacco dei giganti", "Ken il guerriero" e "Il mio vicino Totoro" trovano l'anime giusto come primo risultato. I sinonimi però li aggiungono gli utenti di AniList, quindi non tutti i titoli italiani ci sono.
- La pagina suggerisce di cercare in romaji o in inglese quando la ricerca non dà risultati.

### 3. Dettaglio

La scheda di un anime: copertina, titolo, trama, generi, studio, numero e durata degli episodi, stato di messa in onda, prossimo episodio in uscita. Da qui si aggiunge l'anime alla lista e se ne modifica la voce.

- **Trama:** quella di AniList, che è in inglese. Il testo ha `lang="en"` e accanto al titolo della sezione compare "(in inglese, da AniList)". Gli spoiler segnati da AniList non si mostrano.
- **Prossimi episodi:** elenco dei prossimi episodi non ancora andati in onda (fino a 4), presi dal palinsesto di AniList, con numero, giorno e ora nel fuso del browser. Se non ci sono episodi in programma, la scheda lo dice.

### 4. La mia lista

Gli anime della lista AniList dell'utente, filtrabili per stato. Per ogni voce si modificano stato, episodi visti, voto e note; una voce si rimuove dopo una conferma. Senza login: modalità demo.

- **Distribuzione dei voti (M6):** sopra la lista, un grafico a barre con il numero di anime per voto, una barra per ogni voto intero da 1 a 10 (la barra 8 comprende i voti da 8,0 a 8,9); gli anime senza voto non contano.
  - Un clic su una barra filtra la lista su quel voto, insieme al filtro per stato; un secondo clic sulla stessa barra toglie il filtro. La barra attiva si distingue anche senza colore.
  - Le barre si usano da tastiera: ognuna è un pulsante con lo stato premuto (`aria-pressed`) e un nome completo, per esempio "Voto 8: 12 anime".
  - Alternativa testuale: gli stessi numeri in una tabella, leggibile da lettori di schermo e da chi non vede il grafico.
  - È lo stesso componente della "Distribuzione dei voti" delle Statistiche.

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
- **Distribuzione dei voti:** da 1 a 10, con lo stesso grafico di "La mia lista" (barre da tastiera, alternativa testuale). Qui un clic su una barra porta a "La mia lista" filtrata su quel voto.
- **Studi più presenti:** i primi 5.

### 7. Cosa guardo stasera?

La funzione principale del sito: aiuta a scegliere cosa guardare nel tempo che si ha.

- L'utente indica quanto tempo ha: 30 minuti, 1 ora, 2 ore, serata intera.
- L'app propone **2–3 opzioni dalla sua lista AniList**, ognuna con il motivo:
  - **episodi arretrati** di un anime che sta guardando: "Sei indietro di 2 episodi: 48 minuti" (episodi × durata di un episodio);
  - **serie quasi finite:** "Ti manca 1 episodio";
  - **titoli in "Da vedere" adatti alla durata**, per esempio un film che sta nel tempo indicato.
- Si calcola dai dati della lista già letta, con la durata degli episodi (`Media.duration`) aggiunta ai suoi campi: nessuna richiesta in più ad AniList.
- Senza login funziona in modalità demo, sulla lista pubblica del profilo demo.
- **Dove:** nella Home, subito sotto l'intestazione della stagione, prima di "Continua a guardare".
- **Durate:** 30, 60 e 120 minuti; "serata intera" vale 180 minuti.
- **Candidate:** dalla lista, solo titoli già usciti e con la durata di un episodio nota. Cinque tipi, in ordine di priorità:
  1. **La finisci stasera:** in "Sto guardando" o "In rewatch", tutti gli episodi che mancano sono usciti e stanno nel tempo. "Ti manca 1 episodio: 24 minuti", "Ti mancano 3 episodi: la finisci in 1 ora e 12 minuti".
  2. **Arretrati di un anime in corso:** in "Sto guardando" o "In rewatch", anime in corso con episodi arretrati; si propongono quanti ne stanno nel tempo, almeno uno. "Sei indietro di 2 episodi: 48 minuti", oppure "Sei indietro di 5 episodi: stasera 2, 48 minuti".
  3. **Una serie da recuperare:** come il tipo 1, ma quello che manca non sta nel tempo. "Ti mancano 10 episodi: stasera 2, 48 minuti".
  4. **Da vedere, sta tutto nel tempo:** film, OVA o serie brevi in "Da vedere" la cui durata totale sta nel tempo. "Film di 1 ora e 50 minuti: sta nelle tue 2 ore".
  5. **Da vedere, da cominciare:** in "Da vedere", un episodio sta nel tempo. "Comincia: 2 episodi in 48 minuti".
  - Per i tipi 4 e 5 una seconda riga dice da quanto il titolo è nella lista: "È nella tua lista da 5 mesi" (`MediaList.createdAt`).
- **Ordine:** a parità di tipo, per i tipi 1–3 prima l'anime modificato più di recente; per i tipi 4 e 5 prima il titolo in lista da più tempo. Si mostrano 3 proposte: la prima candidata di ogni tipo, in ordine di priorità, poi le successive fino a 3.
- **Altre proposte:** un pulsante mostra le 3 candidate successive, nell'ordine completo, senza nuove richieste; quando sono finite, il pulsante dice "Non ci sono altre proposte".
- **Niente di adatto:** con la lista vuota, un invito a Ricerca e agli anime della stagione; se niente sta nel tempo scelto, "Niente nella tua lista sta in 30 minuti." con un pulsante per la durata successiva (tranne che per la serata intera) e il link a Ricerca.
- **Modalità demo:** senza login le proposte vengono dalla lista pubblica del profilo demo, con l'avviso e l'invito ad accedere; nessun "+1" né modifica.
- **Richieste:** con login nessuna in più (la lista della sessione). In demo la lista si chiede al nostro server alla prima scelta di una durata; il server la tiene in cache 1 ora, con la stessa voce di "La mia lista" (ADR-0003).

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
- **Voto personale** da 1,0 a 10,0 con un decimale (per esempio 8,5), facoltativo
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
