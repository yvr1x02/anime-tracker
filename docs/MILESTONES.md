# MILESTONES — Anime Tracker v1

Si lavora su **una milestone alla volta**: quella segnata come attiva. Ogni milestone termina con qualcosa che funziona e si può provare online.

**Regola per ogni milestone:** ogni nuova pagina entra nel controllo di accessibilità di `e2e/accessibility.spec.ts` (axe, WCAG 2.2 AA) nello stesso commit che la aggiunge.

**Milestone attiva:** M3

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

## M3 — Home

- Anime della stagione in corso, ordinati per popolarità, con l'anime più popolare in evidenza (`docs/DESIGN.md`, "Home").
- **"Continua a guardare"** per chi è collegato (SPEC, "Home"): anime della lista con episodi usciti e non visti, calcolati dai dati della lista, senza richieste in più. È la base di M4.
- "← Torna indietro" nel Dettaglio: quando il Dettaglio è stato aperto direttamente, porta alla Home invece che a `/ricerca`.
- Verifica sull'app vera che la prima fila di card della Home sia visibile a 1280×800 (`docs/DESIGN.md`, "Da decidere o verificare più avanti").

## M4 — Cosa guardo stasera?

- La funzione di SPEC, "Cosa guardo stasera?": dato il tempo disponibile, 2–3 proposte dalla lista dell'utente, ognuna con il motivo; modalità demo senza login.
- Calcoli in funzioni pure testate con Vitest (episodi arretrati, minuti, scelta e ordine delle proposte), con fusi orari espliciti.
- Durata degli episodi (`Media.duration`) aggiunta ai campi della lista: nessuna richiesta in più.
- Prima di scrivere codice: piano con posizione nella pagina, regole di scelta e casi senza proposte.

## M5 — Calendario

- Settimana corrente e settimane successive.
- Orari nel fuso del browser, con test su fusi espliciti.
- Filtro "solo la mia lista", disattivato senza login.

## M6 — Statistiche

- Calcoli sulla lista letta da AniList, testati con Vitest; modalità demo senza login.
- Grafici Recharts con alternativa testuale dei dati.
- **Distribuzione dei voti in "La mia lista"** (SPEC, "La mia lista"): grafico a barre per voto intero; un clic su una barra filtra la lista su quel voto, un secondo clic toglie il filtro. Barre usabili da tastiera (pulsanti con `aria-pressed`), alternativa testuale in tabella. Lo stesso componente serve alla pagina Statistiche. Prima di scriverlo, verificare nella documentazione di Recharts se le barre si possono rendere pulsanti accessibili; altrimenti barre disegnate con HTML e CSS.

## M7 — Passata di stile

- Transizione card → Dettaglio con le View Transitions (`docs/DESIGN.md`, "Card → Dettaglio"): la copertina passa dalla card al Dettaglio, l'header resta fermo, il focus va sul titolo e al ritorno sulla card; con movimento ridotto solo dissolvenza.
- **Misura con CPU rallentata 4×** (Chrome DevTools, a macchina scarica) della transizione vera. Se perde frame diventa una dissolvenza, secondo il budget di prestazioni di `docs/DESIGN.md`.
- Menu dell'header per il telefono: da M2 la navigazione scorre in orizzontale sotto i 640px, una soluzione provvisoria che non regge altre voci (Calendario, Statistiche).
- Striscia "in onda ora" sotto l'header della Home (`docs/DESIGN.md`), spostata qui da M3 (decisione del 2026-11-20): è soprattutto animazione, con il pulsante di pausa per WCAG 2.2.2.
- Revisione dell'aspetto delle pagine fatte fino a qui. Appunti dell'utente: _da completare_.

## M8 — Rifinitura

- Accessibilità, versione mobile, stati vuoti e di errore.
- README con screenshot.

## Dopo la v1

- Wrapped annuale.
