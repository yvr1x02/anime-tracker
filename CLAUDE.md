# CLAUDE.md — Anime Tracker

Istruzioni specifiche di questo progetto. Le regole generali (collaborazione, approvazioni, standard, workflow) arrivano dal Personal AI Brain caricato a livello utente: qui c'è solo ciò che vale per questo repository.

## Cos'è il progetto

Client non ufficiale e complementare di AniList per seguire i propri anime, basato sulla sua API GraphQL (ADR-0004). È un **progetto-esercizio per il portfolio**, non un prodotto per utenti reali: conta la qualità dell'esecuzione (codice, UX, accessibilità, documentazione), non il numero di funzioni.

Specifica: [docs/SPEC.md](docs/SPEC.md). Piano a milestone: [docs/MILESTONES.md](docs/MILESTONES.md). Decisioni: [docs/adr/](docs/adr/).

## Regole del progetto

- **Una milestone alla volta.** Lavora solo sulla milestone attiva in `docs/MILESTONES.md`; ciò che emerge fuori ambito va annotato nel report, non implementato.
- **La lista vive su AniList** (ADR-0004). Login solo con OAuth AniList, gestito dal server Next.js; nessun database. Nessuna copia locale della lista o dei dati degli anime: niente `localStorage`, niente persistenza della cache di TanStack Query, niente backup. I termini d'uso di AniList vietano tracker concorrenti e l'uso dell'API come archivio.
- **Token e segreti.** Il token AniList sta solo nel cookie di sessione `__Host-` (`HttpOnly`); non arriva mai al JavaScript della pagina, agli URL o ai log. Le variabili d'ambiente sono solo lato server: mai il prefisso `NEXT_PUBLIC_`. `.env.example` elenca quelle in uso.
- **Rispetto dell'API AniList.** Segui la strategia di [ADR-0003](docs/adr/0003-dati-cache-rate-limit.md): niente richieste a ogni tasto premuto, niente polling, gestione esplicita degli errori 429. Prima di scrivere una query, verifica i campi nello schema ufficiale invece di indovinarli.
- **Attribuzione.** Ogni pagina mostra che i dati provengono da AniList, con link. Copertine e immagini si caricano dagli URL forniti dall'API, non si ricaricano nel repository.
- **Niente uso commerciale.** Nessuna pubblicità, nessun pagamento, nessuna raccolta di dati degli utenti.
- **Lingua.** Interfaccia in italiano. Codice, nomi di file e identificatori in inglese. Documentazione in italiano. Eccezione: le cartelle delle route in `src/app/` sono gli indirizzi delle pagine, che fanno parte dell'interfaccia, quindi sono in italiano (`/ricerca`, `/anime/[id]`).
- **Fuso orario.** Gli orari di uscita si mostrano nel fuso del browser dell'utente; i test usano fusi espliciti.
- **Commit.** Nessuna riga `Co-Authored-By` di Claude nei messaggi di commit.

## Comandi

Node 22 (`engines` in `package.json`).

| Comando | Cosa fa |
|---|---|
| `npm ci` | Installa le dipendenze dal lockfile |
| `npx playwright install --only-shell chromium` | Scarica il Chromium senza finestra per i test end-to-end (una volta per macchina, fuori dal repository) |
| `npm run dev` | Server di sviluppo su `http://localhost:3000`; prima rigenera i tipi GraphQL |
| `npm run lint` | ESLint |
| `npm run typecheck` | Rigenera i tipi di route e GraphQL, poi `tsc --noEmit` |
| `npm test` | Test di Vitest (`src/**/*.test.ts`) |
| `npm run test:e2e` | Test di Playwright (`e2e/`), compresi i controlli axe: svuota la cache di `fetch`, fa la build e la avvia sulla porta 3100, che deve essere libera |
| `npm run build` | Build di produzione; prima rigenera i tipi GraphQL |
| `npm run start` | Avvia la build di produzione su `http://localhost:3000` |
| `npm run codegen` | Rigenera i tipi in `src/gql/` dallo schema salvato |
| `npm run screenshots` | Rifà gli screenshot del README in `docs/screenshots/`, dai dati della vetrina del finto AniList (`e2e/showcase.mjs`, `FAKE_SHOWCASE=1`); usa le stesse porte dei test end-to-end, quindi non in contemporanea |
| `npm run check:secret` | Cerca il client secret di `.env.local` nei file del repository e nella cronologia; stampa solo dove lo trova, mai il valore |
| `npm run codegen:schema` | Riscarica lo schema da AniList: solo quando serve aggiornarlo, perché consuma il limite di richieste |
