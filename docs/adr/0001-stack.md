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

## Nota successiva

**2026-11-19, [ADR-0004](0004-client-anilist-con-login.md):** Zustand, previsto da ADR-0002 per la lista nel browser, non fa parte dello stack. La lista vive su AniList ed è stato del server, gestito con TanStack Query già scelto qui, con la cache solo in memoria.

**2026-11-23, M6:** Recharts non fa parte dello stack; i grafici sono disegnati in HTML e CSS. La SPEC vuole le barre della distribuzione dei voti come pulsanti con `aria-pressed` e un nome completo ("Voto 8: 12 anime"). La documentazione di Recharts 3.11.0, verificata il 2026-11-23, non lo prevede: con `accessibilityLayer` (attivo di default) il grafico è un solo elemento della tabulazione con `role="application"`, le frecce spostano il tooltip, e barre focalizzabili con ruolo e stato non sono documentate (sarebbero possibili solo forzando il prop `shape`). In più Recharts porta 11 dipendenze proprie (fra cui Redux Toolkit, react-redux e immer) per due grafici a barre. In HTML e CSS le barre sono `<button>` veri, senza dipendenze; l'alternativa testuale dei dati resta obbligatoria.
