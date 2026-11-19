# MILESTONES — Anime Tracker v1

Si lavora su **una milestone alla volta**: quella segnata come attiva. Ogni milestone termina con qualcosa che funziona e si può provare online.

**Milestone attiva:** M0

## M0 — Fondamenta

- Progetto Next.js con TypeScript, Tailwind CSS v4 e lint (ADR-0001).
- Vitest e Playwright configurati, con un test di esempio ciascuno.
- GraphQL Codegen collegato allo schema ufficiale di AniList.
- `.gitignore`.
- **Direzione visiva** in `docs/DESIGN.md`: palette, font, aspetto di una card. Approvata prima di scrivere i componenti.
- Layout di base con l'attribuzione ad AniList su ogni pagina.
- Scelta del meccanismo di cache di Next.js sulla versione installata (ADR-0003).
- Pubblicazione su Vercel, aggiornata a ogni push.
- Comandi compilati nel `CLAUDE.md`.

## M1 — Ricerca e Dettaglio

- Client per AniList e prime query tipizzate.
- Pagina di Ricerca (ADR-0003: 400 ms, almeno 3 caratteri).
- Pagina di Dettaglio, con cache sul server.
- Verifiche: richieste dirette dal browser ad AniList (CORS); ricerca dei titoli italiani tra i sinonimi.

## M2 — La mia lista

- Store Zustand con `persist` e numero di versione (ADR-0002).
- Aggiunta e modifica dal Dettaglio e dalle card.
- Pagina "La mia lista" con filtro per stato.
- Regole automatiche su date ed episodi.
- Esportazione e importazione del backup.

## M3 — Home

- Anime della stagione in corso, ordinati per popolarità.

## M4 — Calendario

- Settimana corrente e settimane successive.
- Orari nel fuso del browser, con test su fusi espliciti.
- Filtro "solo la mia lista".

## M5 — Statistiche

- Calcoli testati con Vitest.
- Grafici Recharts con alternativa testuale dei dati.

## M6 — Rifinitura

- Accessibilità, versione mobile, stati vuoti e di errore.
- README con screenshot.

## Dopo la v1

- Wrapped annuale.
