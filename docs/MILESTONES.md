# MILESTONES — Anime Tracker v1

Si lavora su **una milestone alla volta**: quella segnata come attiva. Ogni milestone termina con qualcosa che funziona e si può provare online.

**Regola per ogni milestone:** ogni nuova pagina entra nel controllo di accessibilità di `e2e/accessibility.spec.ts` (axe, WCAG 2.2 AA) nello stesso commit che la aggiunge.

**Milestone attiva:** M8

## M0 — Fondamenta (completata il 2026-11-19)

- Progetto Next.js con TypeScript, Tailwind CSS v4 e lint (ADR-0001).
- Vitest e Playwright configurati, con un test di esempio ciascuno.
- GraphQL Codegen collegato allo schema ufficiale di AniList.
- `.gitignore`.
- **Direzione visiva** in `docs/DESIGN.md`: palette, font, aspetto di una card. Approvata prima di scrivere i componenti.
- Layout di base con la dichiarazione di ADR-0004 su ogni pagina: client non ufficiale, non affiliato ad AniList, dati forniti da AniList, con link.
- Scelta del meccanismo di cache di Next.js sulla versione installata (ADR-0003).
- Pubblicazione su Vercel, aggiornata a ogni push.
- Comandi compilati nel `CLAUDE.md`.
- La misura del movimento con CPU rallentata 4×, prevista qui, passa a M1: si fa sull'app vera, non sull'anteprima di `docs/DESIGN.md`.

## M1 — Ricerca e Dettaglio (completata il 2026-11-20)

- Client per AniList e prime query tipizzate.
- Pagina di Ricerca (ADR-0003: 400 ms, almeno 3 caratteri).
- Pagina di Dettaglio, con cache sul server.
- Elenco dei prossimi episodi nel Dettaglio, dal palinsesto di AniList (`airingSchedule`, `docs/DESIGN.md`).
- Pagina d'errore (`error.tsx`) in italiano, con i messaggi di ADR-0003.
- Verifiche: richieste dirette dal browser ad AniList (CORS); ricerca dei titoli italiani tra i sinonimi.
- La transizione card → Dettaglio e la misura con CPU rallentata 4×, previste qui, passano a M7 (decisione del 2026-11-20: prima tutte le funzionalità, poi lo stile).
- La verifica della cache di `fetch` su Vercel (ADR-0003) passa a M2: l'anteprima chiede l'accesso a Vercel e non si è potuta fare da qui.

## M2 — Login e La mia lista (completata il 2026-11-20)

- Login OAuth con AniList (ADR-0004): avvio, ritorno con verifica di `state`, cookie di sessione `__Host-`, logout che svuota anche la cache di TanStack Query. Due applicazioni AniList (sviluppo e produzione) e variabili d'ambiente su Vercel.
- Pagina "La mia lista" con filtro per stato, letta da AniList con una sola richiesta.
- Aggiunta, modifica ed eliminazione dal Dettaglio, dalle card e dalla lista, con aggiornamento immediato e ritorno allo stato precedente in caso di errore. Clic sugli episodi raggruppati (800ms), inviati subito se la pagina viene nascosta o chiusa.
- Regole automatiche su date ed episodi.
- Modalità demo in sola lettura senza login (`ANILIST_DEMO_USERNAME`).
- Verifiche elencate in ADR-0004, "Da verificare all'implementazione".
- Verifica su Vercel della cache di `fetch`, rimasta da M1 (ADR-0003): ora dei dati di un Dettaglio prima e dopo un nuovo deploy.

## M3 — Home (completata il 2026-11-20)

- Anime della stagione in corso, ordinati per popolarità, con l'anime più popolare in evidenza (`docs/DESIGN.md`, "Home").
- **"Continua a guardare"** per chi è collegato (SPEC, "Home"): anime della lista con episodi usciti e non visti, calcolati dai dati della lista, senza richieste in più. È la base di M4.
- "← Torna indietro" nel Dettaglio: quando il Dettaglio è stato aperto direttamente, porta alla Home invece che a `/ricerca`.
- Verifica sull'app vera che la prima fila di card della Home sia visibile a 1280×800 (`docs/DESIGN.md`, "Da decidere o verificare più avanti").

## M4 — Cosa guardo stasera? (completata il 2026-11-20)

- La funzione di SPEC, "Cosa guardo stasera?": dato il tempo disponibile, 2–3 proposte dalla lista dell'utente, ognuna con il motivo; modalità demo senza login.
- Calcoli in funzioni pure testate con Vitest (episodi arretrati, minuti, scelta e ordine delle proposte), con fusi orari espliciti.
- Durata degli episodi (`Media.duration`) aggiunta ai campi della lista: nessuna richiesta in più.
- Prima di scrivere codice: piano con posizione nella pagina, regole di scelta e casi senza proposte.

## M5 — Calendario (completata il 2026-11-20)

- Settimana corrente e settimane successive.
- Orari nel fuso del browser, con test su fusi espliciti.
- Filtro "solo la mia lista"; senza login usa la lista pubblica del profilo demo, con l'avviso (decisione del 2026-11-20, SPEC e ADR-0004).

## M6 — Statistiche (completata il 2026-11-23)

- Calcoli sulla lista letta da AniList, testati con Vitest; modalità demo senza login.
- Grafici in HTML e CSS con alternativa testuale dei dati (decisione del 2026-11-23: niente Recharts, nota in ADR-0001).
- **Distribuzione dei voti in "La mia lista"** (SPEC, "La mia lista"): grafico a barre per voto intero; un clic su una barra filtra la lista su quel voto, un secondo clic toglie il filtro. Barre usabili da tastiera (pulsanti con `aria-pressed`), alternativa testuale in tabella. Lo stesso componente serve alla pagina Statistiche. Verificato il 2026-11-23: nella documentazione di Recharts le barre-pulsante non ci sono, quindi barre in HTML e CSS.

## M7 — Passata di stile (completata il 2026-11-24)

- Transizione card → Dettaglio con le View Transitions (`docs/DESIGN.md`, "Card → Dettaglio"): la copertina passa dalla card al Dettaglio, l'header resta fermo, il focus va sul titolo e al ritorno sulla card; con movimento ridotto solo dissolvenza.
- **Misura con CPU rallentata 4×** (Chrome DevTools, a macchina scarica) della transizione vera. Se perde frame diventa una dissolvenza, secondo il budget di prestazioni di `docs/DESIGN.md`. Misurata il 2026-11-24: nessun frame perso oltre a quello che perde anche la dissolvenza, tranne 3 corse a freddo su 23; la trasformazione resta (DESIGN, "Budget di prestazioni").
- Ritorno con Indietro del browser e con "← Torna indietro": la copertina torna nella card, come all'andata al contrario (richiesta del 2026-11-24). React non anima un `popstate`, quindi il ritorno è disegnato con la Web Animations API (DESIGN, "View Transitions"); misurato a CPU 4× senza frame persi.
- Menu dell'header per il telefono: da M2 la navigazione scorre in orizzontale sotto i 640px, una soluzione provvisoria che non regge altre voci (Calendario, Statistiche). Diventa un pulsante "Menu" a scomparsa (DESIGN, "Header e navigazione").
- Striscia "in onda ora" sotto l'header della Home (`docs/DESIGN.md`), spostata qui da M3 (decisione del 2026-11-20): è soprattutto animazione, con il pulsante di pausa per WCAG 2.2.2. Contenuto: gli episodi delle prossime 24 ore, al massimo 12 (decisione del 2026-11-23).
- **Regola della prima fila della Home** (decisione del 2026-11-23, al posto di "prima fila entro 800px"): a 1280×800 la prima fila comincia sopra gli 800px e se ne vedono almeno 100px di copertine. Il test di `e2e/home.spec.ts` si aggiorna.
- **Ricerca rapida** in sovrimpressione (SPEC, "Ricerca"; DESIGN, "Ricerca rapida"): ⌘K / Ctrl+K e pulsante "Cerca" nell'header, dialogo modale con combobox; "Ricerca" esce dalla navigazione.
- **Calendario un giorno alla volta** (SPEC e DESIGN, "Calendario"): striscia dei 7 giorni, `?giorno=` con redirect da `?settimana=`.
- **La mia lista senza grafico dei voti:** il filtro `?voto=` resta, con l'etichetta "Voto 8 ×".
- Test del calendario che dipendono da giorno e ora: deterministici con `page.clock` di Playwright, così non si saltano mai (spostato qui da M8, decisione del 2026-11-23, perché in M7 i test del calendario si riscrivono).
- Revisione dell'aspetto delle pagine fatte fino a qui: nessun appunto in più, Home, Dettaglio e Statistiche restano così (decisione del 2026-11-24).

## M8 — Rifinitura (lavoro fatto il 2026-11-24; chiusura dopo la prova in produzione)

Piano approvato il 2026-11-24. Esito di ogni passo:

1. **Test con il login che possono fallire a caso:** fatto. Ogni worker di Playwright ha la sua lista di prova nel finto AniList (cookie `e2e-user` sul percorso di autorizzazione, token legato all'utente, `__reset` e `__fail-saves` per utente); `my-list.spec.ts` non gira più in sequenza. I tre file con il login ripetuti 5 volte in parallelo: 315 su 315, prima 7 falliti e 121 non eseguiti.
2. **Focus quando una card esce da La mia lista:** fatto. Niente più previsione (`savedStatusAndScore` tolta): la lista reagisce all'uscita reale della card, il focus si sposta solo se è ancora nella card, l'annuncio dice lo stato reale. Il "+1" sull'ultimo episodio passa il focus a "Modifica". ADR-0004 chiude senza prova i comportamenti di AniList da cui il codice non dipende più.
3. **Calendario, 200 con un errore:** chiuso senza correzione in ADR-0003 (i log di produzione non sono leggibili da qui; nessun caso nelle prove sui dati veri).
4. **`robots.txt` che vieta tutto:** fatto, scritto in ADR-0003 come contromisura di cortesia.
5. **Accessibilità, telefono, stati vuoti e di errore:** revisione fatta e corretti: riadattamento a 320px (header e Statistiche), bersagli di 44px (striscia, "Esci", tabella del grafico), titolo `h2` "Risultati" nella Ricerca, lista vuota con l'indicazione di cosa fare, messaggi di "Cosa guardo stasera?" e del Calendario letti una volta sola. Il nuovo tentativo di `/api/list` e `/api/demo-list` era già uno solo (verificato: errore dopo circa 1,4 secondi). La prova con VoiceOver la fa l'utente.
6. **Documentazione allineata al codice:** fatto (DESIGN, ADR-0003, ADR-0004).
7. **Prova finale in produzione:** fatta sulla versione pubblicata (`main`, senza M8). Tutte le pagine rispondono; Core Web Vitals nei limiti tranne l'LCP della Home da telefono (5,6 s con rete "4G lenta" e CPU 4×). Il CLS della Home (0,083) è corretto in M8. **Aperti:** in produzione la lista demo non è disponibile (`/api/demo-list` risponde 404, mentre AniList dà la lista pubblica del profilo: probabilmente manca `ANILIST_DEMO_USERNAME` su Vercel); login in produzione da provare dall'utente; dopo il merge, la stessa prova sulla versione con M8.
8. **README finale:** fatto, con il link alla produzione in cima e gli screenshot della vetrina del finto AniList (`npm run screenshots`).
9. Chiusura: questo resoconto e il testo della PR.

Facoltativi, da valutare dopo la chiusura: misura a CPU 4× degli altri effetti, animazione con Avanti, striscia a 390px, peso di Noto Sans JP, `sitemap.xml`, `LICENSE`.

## Dopo la v1

- Wrapped annuale.
- **Effetti di DESIGN non fatti nella v1** (decisione del 2026-11-24; descrizioni in DESIGN, "Effetti" e "View Transitions"): l'indicatore della pagina attiva che scorre verso la nuova voce (`nav-indicator`), il riposizionamento delle card al cambio di filtro in La mia lista e nel Calendario (`card-{id}`), le animazioni degli elementi che entrano o escono senza corrispondente (`:only-child`). Ognuno con la misura a CPU 4×.
