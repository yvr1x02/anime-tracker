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

## M8 — Rifinitura

Piano approvato il 2026-11-24, in quest'ordine:

1. **Test con il login che possono fallire a caso.** I test di accessibilità con il login (`e2e/accessibility.spec.ts`) leggono la lista dell'utente di prova, che `e2e/my-list.spec.ts` modifica e ripristina mentre gira in parallelo: visto fallire una volta in M6, su un'esecuzione parziale. Soluzione: una lista di prova separata nel finto AniList per ogni worker (un utente di prova per worker, scelto con `testInfo.workerIndex`), invece di spostare i test in sequenza come in M5.
2. **Focus quando una card esce da La mia lista** (M6): decidere dove va il focus dalla risposta di `SaveMediaListEntry` invece che dalla previsione di `savedStatusAndScore` (`src/lib/list-rules.ts`), così non si dipende dal completamento automatico di AniList. Prima del codice, i casi in cui previsione e risposta possono divergere.
3. **Calendario, risposta di AniList con stato 200 e un errore su una pagina** (ADR-0003): verifica nei log di produzione; correzione solo se si presenta.
4. **`robots.txt` che vieta tutto** (decisione del 2026-11-24): contromisura di cortesia verso i bot, scritta in ADR-0003; la protezione vera restano la cache e la gestione del 429.
5. **Accessibilità, versione mobile, stati vuoti e di errore:** revisione pagina per pagina; prima l'elenco di ciò che si trova, poi le correzioni.
6. **Documentazione allineata al codice:** le voci "da decidere o verificare" di DESIGN e di ADR-0004 chiuse o aggiornate.
7. **Prova finale in produzione:** tutte le pagine, login, modalità demo, Core Web Vitals contro gli obiettivi di DESIGN.
8. **README finale:** in cima il link alla versione in produzione, presentato come il modo migliore per vedere l'app; screenshot sui dati del finto AniList, curati (decisione del 2026-11-24: le copertine vere non entrano nel repository); sezione sulle decisioni principali (ADR-0003, ADR-0004, accessibilità).
9. Chiusura: MILESTONES, report, testo della PR.

I facoltativi (misura a CPU 4× degli altri effetti, animazione con Avanti, striscia a 390px, peso di Noto Sans JP, `sitemap.xml`, `LICENSE`) si valutano dopo la chiusura di M8.

## Dopo la v1

- Wrapped annuale.
- **Effetti di DESIGN non fatti nella v1** (decisione del 2026-11-24; descrizioni in DESIGN, "Effetti" e "View Transitions"): l'indicatore della pagina attiva che scorre verso la nuova voce (`nav-indicator`), il riposizionamento delle card al cambio di filtro in La mia lista e nel Calendario (`card-{id}`), le animazioni degli elementi che entrano o escono senza corrispondente (`:only-child`). Ognuno con la misura a CPU 4×.
