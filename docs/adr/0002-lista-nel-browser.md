# ADR-0002 — Lista personale salvata nel browser

**Stato:** sostituito da [ADR-0004](0004-client-anilist-con-login.md)
**Data:** 2026-11-19

> I termini d'uso dell'API di AniList vietano i servizi di lista o tracker concorrenti e l'uso dell'API come archivio di dati: questa decisione non è più valida. La lista vive sull'account AniList dell'utente (ADR-0004).

## Contesto

La v1 non ha login né database (vedi [SPEC](../SPEC.md)): la lista personale deve vivere nel browser. Ogni voce contiene i dati dell'utente (stato, episodi visti, voto, date, note) e una copia ridotta dei dati dell'anime, usata dalla lista e dalle statistiche senza richieste all'API.

Stima delle dimensioni: circa mezzo KB per voce, quindi circa mezzo MB anche con 1000 anime.

## Decisione

1. **Archivio:** `localStorage`, sotto una sola chiave.
2. **Accesso dai componenti:** uno store Zustand con il middleware `persist`, che salva e rilegge la lista da `localStorage`.
3. **Versione dei dati:** i dati salvati portano un numero di versione. Quando la forma di una voce cambia, si incrementa la versione e si scrive una migrazione che converte i dati vecchi.
4. **Backup:** la lista si esporta e si importa come file JSON. Un file importato viene validato prima di essere accettato; un file non valido non modifica la lista. L'importazione **sostituisce** la lista attuale, dopo una conferma esplicita.

### Forma di una voce

Le voci sono indicizzate per ID AniList dell'anime.

| Campo | Contenuto |
|---|---|
| `mediaId` | ID AniList dell'anime |
| `status` | Uno degli stati AniList (`CURRENT`, `PLANNING`, `COMPLETED`, `PAUSED`, `DROPPED`, `REPEATING`) |
| `progress` | Episodi visti |
| `score` | Voto da 1 a 10, facoltativo |
| `startedAt`, `completedAt` | Date compilate dalle regole automatiche della SPEC |
| `notes` | Note personali, facoltative |
| `media` | Copia ridotta: titoli, copertina, numero e durata degli episodi, generi, studi, data dell'ultimo aggiornamento |
| `updatedAt` | Data dell'ultima modifica della voce |

La copia ridotta si aggiorna quando si apre il dettaglio dell'anime.

## Alternative considerate

- **IndexedDB.** Più spazio e accesso asincrono, ma più complesso e di solito richiede una libreria. Scartato: le dimensioni stimate stanno ampiamente nei limiti di `localStorage`.
- **Hook proprio basato su `useSyncExternalStore`.** Nessuna dipendenza, ma salvataggio, versioni e migrazioni andrebbero scritti a mano. Scartato a favore di Zustand.
- **Importazione che unisce le liste** (vince la voce modificata più di recente). Scartata: più complessa e meno prevedibile; il backup serve a ripristinare o spostare la lista.
- **Nessun backup.** Scartato: senza login, svuotare i dati del browser cancellerebbe la lista.

## Conseguenze

- `localStorage` esiste solo nel browser: il server non conosce la lista. Le parti dell'interfaccia che dipendono dalla lista si mostrano dopo il caricamento lato client, con uno stato di attesa, per evitare differenze tra HTML del server e del client.
- La lista è legata a un browser su un dispositivo; per spostarla si usa il backup.
- Le opzioni esatte di `persist` (versione, migrazioni) si verificano sulla documentazione della versione installata.
