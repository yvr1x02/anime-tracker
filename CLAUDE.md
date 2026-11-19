# CLAUDE.md — Anime Tracker

Istruzioni specifiche di questo progetto. Le regole generali (collaborazione, approvazioni, standard, workflow) arrivano dal Personal AI Brain caricato a livello utente: qui c'è solo ciò che vale per questo repository.

## Cos'è il progetto

Tracker personale di anime e manga basato sull'API GraphQL pubblica di AniList. È un **progetto-esercizio per il portfolio**, non un prodotto per utenti reali: conta la qualità dell'esecuzione (codice, UX, accessibilità, documentazione), non il numero di funzioni.

Specifica: [docs/SPEC.md](docs/SPEC.md). Piano a milestone: [docs/MILESTONES.md](docs/MILESTONES.md). Decisioni: [docs/adr/](docs/adr/).

## Regole del progetto

- **Una milestone alla volta.** Lavora solo sulla milestone attiva in `docs/MILESTONES.md`; ciò che emerge fuori ambito va annotato nel report, non implementato.
- **Niente login né backend con database nella v1.** La lista personale vive nel browser (vedi ADR-0002). Introdurre account, OAuth AniList o un database è una decisione architetturale da approvare.
- **Rispetto dell'API AniList.** Segui la strategia di [ADR-0003](docs/adr/0003-dati-cache-rate-limit.md): niente richieste a ogni tasto premuto, niente polling, gestione esplicita degli errori 429. Prima di scrivere una query, verifica i campi nello schema ufficiale invece di indovinarli.
- **Attribuzione.** Ogni pagina mostra che i dati provengono da AniList, con link. Copertine e immagini si caricano dagli URL forniti dall'API, non si ricaricano nel repository.
- **Niente uso commerciale.** Nessuna pubblicità, nessun pagamento, nessuna raccolta di dati degli utenti.
- **Lingua.** Interfaccia in italiano. Codice, nomi di file e identificatori in inglese. Documentazione in italiano.
- **Fuso orario.** Gli orari di uscita si mostrano nel fuso del browser dell'utente; i test usano fusi espliciti.
- **Commit.** Nessuna riga `Co-Authored-By` di Claude nei messaggi di commit.

## Comandi

Da compilare in M0, quando il progetto è inizializzato (install, dev, lint, typecheck, test, build).
