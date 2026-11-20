# MILESTONES — Anime Tracker v1

Si lavora su **una milestone alla volta**: quella segnata come attiva. Ogni milestone termina con qualcosa che funziona e si può provare online.

**Regola per ogni milestone:** ogni nuova pagina entra nel controllo di accessibilità di `e2e/accessibility.spec.ts` (axe, WCAG 2.2 AA) nello stesso commit che la aggiunge.

**Milestone attiva:** M2

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
- La transizione card → Dettaglio e la misura con CPU rallentata 4×, previste qui, passano a M6 (decisione del 2026-11-20: prima tutte le funzionalità, poi lo stile).
- La verifica della cache di `fetch` su Vercel (ADR-0003) passa a M2: l'anteprima chiede l'accesso a Vercel e non si è potuta fare da qui.

## M2 — Login e La mia lista

- Login OAuth con AniList (ADR-0004): avvio, ritorno con verifica di `state`, cookie di sessione `__Host-`, logout che svuota anche la cache di TanStack Query. Due applicazioni AniList (sviluppo e produzione) e variabili d'ambiente su Vercel.
- Pagina "La mia lista" con filtro per stato, letta da AniList con una sola richiesta.
- Aggiunta, modifica ed eliminazione dal Dettaglio, dalle card e dalla lista, con aggiornamento immediato e ritorno allo stato precedente in caso di errore. Clic sugli episodi raggruppati (800ms), inviati subito se la pagina viene nascosta o chiusa.
- Regole automatiche su date ed episodi.
- Modalità demo in sola lettura senza login (`ANILIST_DEMO_USERNAME`).
- Verifiche elencate in ADR-0004, "Da verificare all'implementazione".
- Verifica su Vercel della cache di `fetch`, rimasta da M1 (ADR-0003): ora dei dati di un Dettaglio prima e dopo un nuovo deploy.

## M3 — Home

- Anime della stagione in corso, ordinati per popolarità.

## M4 — Calendario

- Settimana corrente e settimane successive.
- Orari nel fuso del browser, con test su fusi espliciti.
- Filtro "solo la mia lista", disattivato senza login.

## M5 — Statistiche

- Calcoli sulla lista letta da AniList, testati con Vitest; modalità demo senza login.
- Grafici Recharts con alternativa testuale dei dati.

## M6 — Passata di stile

- Transizione card → Dettaglio con le View Transitions (`docs/DESIGN.md`, "Card → Dettaglio"): la copertina passa dalla card al Dettaglio, l'header resta fermo, il focus va sul titolo e al ritorno sulla card; con movimento ridotto solo dissolvenza.
- **Misura con CPU rallentata 4×** (Chrome DevTools, a macchina scarica) della transizione vera. Se perde frame diventa una dissolvenza, secondo il budget di prestazioni di `docs/DESIGN.md`.
- Revisione dell'aspetto delle pagine fatte fino a qui. Appunti dell'utente: _da completare_.

## M7 — Rifinitura

- Accessibilità, versione mobile, stati vuoti e di errore.
- README con screenshot.

## Dopo la v1

- Wrapped annuale.
