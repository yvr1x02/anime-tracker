# ADR-0001 — Stack tecnico

**Stato:** accettato
**Data:** 2026-11-19

## Contesto

Il progetto è un tracker di anime basato sull'API GraphQL di AniList (vedi [SPEC](../SPEC.md)). Serve uno stack che:

- permetta di tenere in cache i dati di AniList, che oggi limita le richieste a 30 al minuto;
- abbia tipi affidabili per le risposte dell'API;
- sia riconoscibile in un portfolio da sviluppatore front-end.

Le versioni esatte delle librerie si verificano in M0, al momento dell'installazione.

## Decisione

| Area | Scelta |
|---|---|
| Framework | Next.js (App Router) |
| Linguaggio | TypeScript |
| Stile | Tailwind CSS v4 |
| Tipi dell'API | GraphQL Codegen, generato dallo schema ufficiale di AniList |
| Dati lato client | TanStack Query |
| Grafici | Recharts |
| Test | Vitest per la logica, Playwright per i percorsi completi |
| Package manager | npm |

## Alternative considerate

- **Vite + React, tutto nel browser.** Più semplice e senza server, e ogni visitatore avrebbe il proprio limite di richieste. Scartato: nessuna cache condivisa tra visitatori e pagine non indicizzabili.
- **CSS Modules.** Scartato a favore di Tailwind, già usato in altri progetti.
- **Fetch senza tipi generati.** Scartato: i campi sbagliati emergerebbero solo a runtime.
- **Grafici in SVG fatti a mano.** Zero dipendenze e pieno controllo, ma scartati a favore di Recharts.

## Conseguenze

- Le richieste fatte dal server condividono un unico limite verso AniList: la strategia di cache diventa obbligatoria ed è definita in ADR-0003.
- Lo schema di AniList va scaricato e i tipi rigenerati quando cambiano le query.
- Recharts è una dipendenza in più: i grafici devono comunque restare accessibili, con un'alternativa testuale dei dati.
