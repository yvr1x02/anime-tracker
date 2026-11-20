# DESIGN — Notte di Tokyo

**Stato:** approvato
**Data:** 2026-11-19

Questo documento basta per implementare l'interfaccia. Le verifiche indicate come "nell'anteprima" sono state fatte su un prototipo HTML usato per l'approvazione, che resta fuori dal repository.

Direzione visiva di Anime Tracker: notte viola su cui si accendono pochi colori al neon. L'impatto viene da tipografia grande, copertine in primo piano e un movimento continuo e fluido; la chiarezza viene dalla parsimonia degli accenti e da un movimento che spiega invece di decorare.

## Principi

1. **Le copertine sono il colore.** L'interfaccia resta scura; il colore lo portano le copertine e la loro tinta (`coverImage.color`).
2. **Gli accenti indicano, non decorano.** Al massimo un rosa fisso per vista; il resto del rosa compare solo su interazione o stato.
3. **Tanto movimento, ognuno con uno scopo.** Ogni animazione risponde a "dove sono?", "da dove arriva?" o "cosa è cambiato?". Se non risponde a nessuna, non c'è.
4. **Mai aspettare un'animazione.** L'interfaccia risponde subito; le animazioni sono brevi, interrompibili e non bloccano i clic.

## Palette

Tema unico scuro (`color-scheme: dark`). **Il tema chiaro è fuori dalla v1**: l'app non segue `prefers-color-scheme`. I rapporti di contrasto sono calcolati con la formula WCAG 2.2 sui valori esatti qui sotto.

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0E0A1F` | Fondo della pagina |
| `surface` | `#18122E` | Card, pannelli |
| `raised` | `#231A40` | Elementi sopra le superfici: menu, campi, chip, skeleton, copertina mancante |
| `border` | `#3A2F5E` | Separatori decorativi (non portano informazione) |
| `border-strong` | `#7C6CB0` | Bordi che identificano un controllo (campi, pulsanti secondari) |
| `ink` | `#F4F0FF` | Testo principale, indicatore della pagina attiva, filtro attivo |
| `ink-muted` | `#B8AED8` | Metadati, testo secondario |
| `pink` | `#FF5C8A` | Accento primario: vedi le regole sotto |
| `cyan` | `#5CE1E6` | Accento secondario: anello di focus, link nel testo, tutto ciò che è "in onda" |
| `on-accent` | `#0E0A1F` | Testo e icone sopra rosa, ciano o `ink` |
| `danger` | `#FF8080` | Errori |
| `warning` | `#FFC861` | Avvisi (es. dati in cache scaduti, ADR-0003) |
| `success` | `#6EE7A8` | Conferme |

### Contrasti verificati

Testo normale richiede 4,5:1; testo grande e componenti dell'interfaccia 3:1.

| Primo piano | su `bg` | su `surface` | su `raised` |
|---|---|---|---|
| `ink` | 17,34 | 16,10 | 14,50 |
| `ink-muted` | 9,32 | 8,66 | 7,80 |
| `pink` | 6,61 | 6,14 | 5,53 |
| `cyan` | 12,36 | 11,48 | 10,34 |
| `danger` | 8,00 | 7,43 | 6,69 |
| `warning` | 12,65 | 11,75 | 10,58 |
| `success` | 12,63 | 11,73 | 10,56 |
| `border-strong` (3:1) | 4,28 | 3,97 | 3,58 |

- `on-accent` su `pink`: **6,61**; su `cyan`: **12,36**; su `ink`: **17,34**.
- `border` (1,35–1,62) **non** raggiunge 3:1: solo separatori decorativi, mai unico confine di un controllo.
- Anello di focus `cyan` contro `pink`: 1,87. Per questo l'anello ha sempre uno scostamento e, sopra le copertine, un bordo interno in `bg` che garantisce il contrasto.

### Regole per gli accenti

- **Rosa fisso: al massimo uno per vista.** Nel Dettaglio è il pulsante "Aggiungi alla lista". Le viste senza un'azione primaria (Home, Calendario, Statistiche) non hanno rosa fisso.
- **Rosa nelle card: solo su interazione o stato.** Il pulsante "+" diventa rosa con hover o focus, oppure quando l'anime è già nella lista (icona ✓).
- **Indicatore della pagina attiva e filtro attivo in `ink`**, non in rosa: il rosa resta ai contenuti.
- **Ciano:** focus da tastiera, link nel testo, badge e striscia "in onda". Non si usa per pulsanti, così il focus resta riconoscibile.
- Gli stati della lista (Sto guardando, Completato…) si distinguono con etichetta e icona, non solo con il colore.

## Tinta dalla copertina

AniList fornisce `Media.coverImage.color` (`String`, facoltativo, "Average #hex color of cover image"), verificato in `schema/anilist.graphql`.

- **Validazione:** è un dato esterno che finisce in CSS. Si accetta solo se corrisponde a `^#[0-9a-fA-F]{6}$`; altrimenti, o se è `null`, niente tinta.
- **Regola, in OKLCH:** luminosità **fissata** a quella della superficie, **tonalità** della copertina, **croma** pari al 60% di quello della copertina, con un massimo di 0,06. L'opacità della tinta cresce con il croma della copertina (piena da croma 0,05): le copertine bianche o grigie lasciano la superficie viola invece di renderla grigia.

  ```css
  .has-cover { --tint: oklch(from var(--cover) 0.2067 min(calc(c * 0.6), 0.06) h / min(calc(c * 20), 1)); }
  .card { background-color: var(--surface); background-image: linear-gradient(var(--tint), var(--tint)); }
  ```

  0,2067 è la luminosità OKLCH di `surface`.
- **Bagliore al passaggio del mouse:** ombra esterna nel colore della copertina portato a luminosità 0,75 (croma massimo 0,15), al 40% di opacità. Non ha testo sopra.
- **Tinte più forti, solo dove il contrasto è verificato o dove non c'è testo:**

  | Dove | Valore | Testo sopra? |
|---|---|---|
  | Intestazione del Dettaglio | L 0,27, croma `min(c, 0.12)`, piena nel primo 30% e poi sfuma verso `bg` | Sì: verificato sotto |
  | Chip dei generi nel Dettaglio | L 0,32, croma `min(c × 0.8, 0.1)`, sopra `raised` | Sì: verificato sotto |
  | Kanji di sfondo nel Dettaglio | L 0,7, croma `min(c, 0.12)`, opacità 14% | Testo sopra: verificato sotto |
  | Alone dell'anime in evidenza (Home) | L 0,6, croma `min(c, 0.2)`, opacità `min(c × 13, 0,65)`, cioè fino al 65% | No: è un'ombra esterna (`box-shadow`), dipinta solo fuori dal pannello |
  | Alone della copertina nel Dettaglio | L 0,5, croma `min(c, 0.18)`, opacità fino al 55% | No: resta nei 32px tra copertina e titolo |

  Anche qui l'opacità cresce con il croma della copertina, così le copertine grigie non producono aloni grigi.
- **Senza supporto per la sintassi relativa dei colori:** la variabile non è valida e la card resta `surface` senza tinta.

### Caso peggiore

Calcolato su tutte le 360 tonalità al croma massimo, dopo la riduzione alla gamma sRGB.

| Primo piano | su card tinta | su intestazione del Dettaglio | sopra i kanji, sull'intestazione | su chip dei generi |
|---|---|---|---|---|
| `ink` | 15,33 | 11,89 | 9,31 | 10,19 |
| `ink-muted` | 8,24 | 6,39 | 5,01 | — |
| `cyan` | 10,93 | 8,48 | 6,64 | — |
| `pink` (come testo) | 5,84 | — | — | — |

Il rosa nell'intestazione del Dettaglio è solo il fondo del pulsante, con testo `on-accent` (6,61).

Con la luminosità fissata, anche il rosa resta sopra 4,5:1 su qualunque tinta: la regola della prima versione ("niente testo rosa su superfici tinte") non serve più.

**Limite noto:** a questa luminosità le tonalità calde (beige, arancio, giallo) diventano marroni. È un effetto del colore, non della formula; era visibile nell'anteprima approvata.

## Tipografia

### Space Grotesk

Caricato con `next/font/google`: font variabile (pesi 300–700, un solo file), sottoinsiemi `latin` e `latin-ext` (macron del romaji, es. *Shūmatsu*), `display: "swap"`, esposto come variabile CSS e collegato al token `--font-sans` di Tailwind. Non ha corsivo: l'enfasi si fa con il peso. Le cifre a larghezza fissa (`tabular-nums`) sono supportate, verificato nell'anteprima.

### Scala fluida

Ogni dimensione è un `clamp()` con una parte in `rem`, così lo zoom del browser la ingrandisce sempre. Il rapporto tra massimo e minimo resta entro 2,5, per rispettare il ridimensionamento del testo al 200% (WCAG 1.4.4).

| Token | Dimensione | Peso | Interlinea | Spaziatura lettere | Uso |
|---|---|---|---|---|---|
| `display-xl` | `clamp(3.5rem, 0.5rem + 7vw, 8.5rem)` | 700 | 0,88 | -0,045em | Titolo della Home ("Autunno 2026") |
| `display` | `clamp(2.75rem, 1rem + 6vw, 6.5rem)` | 700 | 0,95 | -0,04em | Titolo del Dettaglio |
| `h1` | `clamp(2rem, 1.2rem + 3.5vw, 4rem)` | 700 | 1,05 | -0,03em | Titolo delle altre pagine |
| `h2` | `clamp(1.375rem, 1.1rem + 1.2vw, 2.25rem)` | 600 | 1,15 | -0,02em | Sezioni |
| `h3` | `clamp(1rem, 0.94rem + 0.3vw, 1.25rem)` | 600 | 1,3 | 0 | Titolo nella card |
| `body` | `clamp(1rem, 0.96rem + 0.2vw, 1.125rem)` | 400 | 1,6 | 0 | Testo, trama |
| `small` | `clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)` | 400 | 1,5 | 0 | Metadati |
| `label` | `0.75rem` | 500 | 1,4 | 0,08em, maiuscolo | Etichette brevi, badge |
| `native` | `clamp(8rem, 2rem + 20vw, 20rem)` | 700 | 1 | 0 | Titolo giapponese decorativo |

- **Home:** "Autunno" pieno e "2026" solo contorno (`-webkit-text-stroke: 2px` in `ink`), su due righe.
- Nessun testo sotto 12px; la trama si limita a circa 65 caratteri per riga; i titoli grandi usano `text-wrap: balance`.
- Numeri che cambiano (episodi, orari, statistiche) con `tabular-nums`.

### Titolo giapponese nel Dettaglio

AniList fornisce `Media.title.native` (`String`, facoltativo), verificato nello schema.

- Gigante, in verticale (`writing-mode: vertical-rl`), dietro l'intestazione sul lato destro, con `aria-hidden="true"`: è solo decorazione. Il titolo originale leggibile compare nella scheda laterale del Dettaglio, con `lang="ja"`.
- **Colore:** il colore della copertina a luminosità 0,7 e opacità 14%; senza tinta, `ink` all'8%. Contrasti del testo sopra i kanji nella tabella della tinta (caso peggiore `ink-muted` 5,01).
- **Posizione:** `top: -0.12em; right: -0.3em`. La colonna di caratteri esce dal bordo destro per circa il 30% della larghezza di un carattere: è l'unico taglio netto, sempre uguale, così si legge come una scelta.
- **In basso la colonna sfuma**, non viene tagliata: lo strato dei kanji ha `mask-image: linear-gradient(to bottom, #000 45%, transparent 85%)` (percentuali dell'altezza dell'intestazione). Così non restano frammenti di caratteri sul bordo inferiore. Nell'anteprima, senza sfumatura, il bordo lasciava visibili 31px su 288 del terzo carattere (糸), che sembravano una lineetta orizzontale: non era voluta, ed è eliminata da questa regola.
- **Ingresso:** all'apertura del Dettaglio scorre di 8% da destra e compare (400ms, `--spring-gentle`, 80ms dopo la pagina). Con movimento ridotto: solo dissolvenza di 150ms.
- **Struttura:** uno strato esterno (assoluto, che copre l'intestazione, senza eventi del puntatore) porta l'animazione d'ingresso e la sfumatura; l'elemento interno con i caratteri porta l'animazione guidata dallo scroll. Due animazioni di `transform` sullo stesso elemento si sovrascriverebbero.
- Se `title.native` manca, l'elemento non c'è.

**Caricamento del font giapponese, senza appesantire la pagina:**

1. **Prima i font di sistema:** `font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", <Noto Sans JP>, sans-serif`. macOS, iOS e Windows hanno già un font giapponese: lì non si scarica nulla. Verificato nell'anteprima su macOS: **0 file di Noto Sans JP scaricati**.
2. **Noto Sans JP come riserva**, con `next/font/google`: solo peso 700, `preload: false`, `display: "optional"`. Next.js lo ospita sul nostro dominio (nessuna richiesta a Google dal browser del visitatore). I caratteri giapponesi sono divisi da Google in blocchi con `unicode-range`: il browser scarica solo i blocchi che contengono i caratteri del titolo. `preload: false` è obbligatorio, perché questi blocchi non sono sottoinsiemi precaricabili (in `next/font` 16.4.6 Noto Sans JP elenca solo `cyrillic`, `latin`, `latin-ext`, `vietnamese`).
3. `display: "optional"`: se il font non arriva subito resta quello di sistema, senza scambi visibili; per una decorazione è il comportamento giusto.

**Da verificare all'implementazione:** i byte scaricati su un sistema senza font giapponesi, e lo spazio occupato nella build dai blocchi ospitati.

## Spaziature e layout

- Scala di Tailwind (unità da 4px). Ritmo principale: 4, 8, 12, 16, 24, 32, 48, 64px.
- Margine laterale della pagina: 16px su mobile, 24px da 640px, 32px da 1024px. Contenuto al massimo 1280px.
- Griglia delle card: `repeat(auto-fill, minmax(12rem, 1fr))` tra 640 e 1024px, `11rem` da 1024px in su, `10rem` sotto i 640px; spazio 16px (24px da 1024px). A 1280px sono 6 colonne; su un telefono largo almeno 352px sono 2 (con 11rem a 390px ne entrava una sola).
- Raggi: 6px per controlli e badge, 12px per card e pannelli, completo per i chip.
- Bersagli toccabili di almeno **44×44px**, oltre il minimo WCAG 2.2 di 24×24.

## Header e navigazione

- Fisso in alto (`position: sticky`), fondo `bg`, bordo inferiore `border`, altezza 64px. Contiene il nome dell'app e la navigazione.
- Ha un `view-transition-name` proprio (`site-header`) ed è escluso dalle animazioni delle View Transitions: è il punto di riferimento fisso.
- Voci di navigazione: `small`, peso 500, `ink-muted`, altezza minima 44px, padding orizzontale 12px. La voce attiva ha `aria-current="page"`, testo `ink` e un **indicatore**: barretta di 2px in `ink`, raggio 2px, rientrata di 12px ai lati, 6px sopra il bordo inferiore della voce. L'indicatore ha un `view-transition-name` proprio (`nav-indicator`), così scorre verso la nuova voce.
- A destra della navigazione, l'account: "Accedi" in ciano, che porta a `/accesso`; da collegati, il nome in `small` `ink-muted` e il pulsante "Esci" (un `<form method="post">`). Compare solo nel browser, perché il nome viene da un cookie (ADR-0004).
- **Sotto i 640px (provvisorio, fino al menu per il telefono di M7):** voci e "Accedi"/"Esci" con padding orizzontale di 8px; la navigazione scorre in orizzontale dentro l'header, con una sfumatura di 24px a destra; il nome dell'utente non compare. L'header resta su una riga, alto 64px, anche a 360px.
- Sotto l'header, solo nella Home, c'è la striscia "in onda ora" (vedi la sezione dedicata).

## Pulsanti e filtri

- **Pulsante:** altezza minima 44px, padding orizzontale 16px, raggio 6px, `small` peso 600, fondo `raised`, bordo `border-strong`, testo `ink`. Premuto: scala 0,97 in 100ms, ritorno con `--spring-bouncy`.
- **Pulsante primario:** fondo e bordo `pink`, testo `on-accent`. Uno solo per vista (vedi le regole per gli accenti).
- **Filtri** (La mia lista: Tutti + i 6 stati; Calendario: Tutti / Solo la mia lista): pulsanti con `aria-pressed`, dentro un `role="group"` con `aria-label`. Il filtro attivo ha fondo `ink`, bordo `ink` e testo `on-accent` (17,34:1), non rosa.
- **Filtri su mobile: una sola riga, mai a capo.** La riga scorre in orizzontale (`flex-wrap: nowrap; overflow-x: auto`), arriva fino ai bordi dello schermo (margine negativo pari al margine laterale della pagina, con lo stesso valore come padding interno e come `scroll-padding-inline`) e ha una sfumatura di 32px sul bordo destro (`mask-image`), che segnala altri filtri. Con la tastiera, il filtro che riceve il focus entra da solo nell'area visibile; all'apertura della pagina il filtro attivo viene portato nell'area visibile.
- Al cambio di filtro le card si riposizionano con le View Transitions (vedi Effetti).

## Home

- **Intestazione in due colonne da 1024px:**
  - a sinistra: etichetta "Stagione in corso", "Autunno 2026" in `display-xl` su due righe e una riga di presentazione;
  - a destra: **l'anime più popolare della stagione** in un pannello (`surface` con la tinta standard), con copertina grande (`clamp(8rem, 11vw, 11rem)` di larghezza), etichetta "N. 1 della stagione", titolo in `h2`, metadati, prossimo episodio in ciano e il pulsante "+". Intorno al pannello, l'alone forte nel colore della copertina.
  - Il pannello si comporta come una card: tutto cliccabile, sollevamento al passaggio del mouse, anello di focus, copertina che si trasforma in quella del Dettaglio.
  - Intestazione: padding verticale 20px sopra e 12px sotto, spazio di 32px tra le colonne. Pannello: padding 16px, raggio 16px, griglia `auto 1fr` con spazio di 20px, contenuto allineato in basso; copertina con raggio 8px. Alone: `box-shadow: 0 0 72px 12px` nel colore indicato nella tabella della tinta.
  - Sotto i 1024px le due colonne si impilano: prima il titolo, poi l'anime in evidenza.
- **"Continua a guardare"** (solo per chi è collegato), tra l'intestazione e la griglia: titolo `h2` e una fila di card (al massimo 6) con la riga "Sei indietro di 2 episodi" o "Ti mancano 2 episodi", l'etichetta "Rewatch" per le voci in rewatch e il "+1".
  - La pagina è uguale per tutti e la sezione si disegna nel browser. Lo spazio d'attesa (titolo e una fila di skeleton) compare solo se il cookie con il nome dice che l'utente è collegato, così chi non è collegato non vede spostamenti. Se non ci sono arretrati, la sezione non compare e lo spazio si chiude.
  - **Focus quando una card sparisce:** un "+1" che mette in pari sposta subito il focus sul titolo della card successiva, o sul titolo `h2` della sezione (`tabindex="-1"`) dopo l'ultima, e una regione `role="status"` della sezione annuncia "Sei in pari con {titolo}". Dopo l'ultima card la sezione resta, con "Sei in pari: nessun episodio arretrato." in `ink-muted`, finché non si ricarica la pagina.
  - Dalla modifica della voce vale lo stesso, alla chiusura del dialogo (il focus non può uscire prima da un dialogo modale), invece di tornare al pulsante "Modifica" che sta per sparire. In pari vuol dire episodi fino agli arretrati o "Completato". Se la card sparisce per un altro stato o perché la voce è eliminata, l'annuncio è "{titolo} non è più in Continua a guardare" e, dopo l'ultima, "Nessun altro anime da continuare."
- Sotto l'intestazione (o sotto "Continua a guardare"), la griglia degli altri anime della stagione in ordine di popolarità, 16px più in basso. Il suo titolo `h2` "Gli altri anime della stagione" è solo per i lettori di schermo, perché visibile sposterebbe la prima fila oltre gli 800px; diventa visibile (32px sopra, 16px sotto) quando c'è "Continua a guardare", per separare le due griglie (`:has()`).
- **La prima fila di card è visibile senza scorrere con un viewport di 1280×800.** Altezze misurate nell'anteprima: header 65px, striscia 45px, intestazione 283px, spazio 16px, card 390px: la prima fila finisce a circa 799px. Se non basta, si riduce l'intestazione (dimensione massima di `display-xl` o padding), non le card.
  - **Verificato in M3 sull'app vera (2026-11-20), senza la striscia:** header 64px, intestazione fino a 366px (pannello in evidenza alto 243px), prima fila fino a **775px**, con una card dal titolo su due righe. Un test di Playwright lo controlla (`e2e/home.spec.ts`).
  - **Con la striscia di M7** (circa 45px) la fila arriverebbe a circa 820px: quando si aggiunge, va ridotta l'intestazione.
- Su un portatile 1280×800 vero il browser occupa parte dello schermo: lì la fila resta tagliata nella parte bassa.

## Ricerca

- Titolo "Ricerca" in `h1`; sotto, un `<form role="search">` largo al massimo 36rem: etichetta visibile "Titolo dell'anime", campo `type="search"` (altezza minima 44px, fondo `surface`, bordo `border-strong`, raggio 6px), pulsante "Cerca" e un testo d'aiuto collegato con `aria-describedby`.
- La ricerca parte da sola (ADR-0003); "Cerca" e Invio la fanno partire subito. L'indirizzo segue la ricerca (`?q=`) senza aggiungere voci alla cronologia.
- Sotto il modulo, un'area `role="status"` annuncia numero di risultati, attesa per il limite di AniList, errori e "nessun risultato". Poi la griglia delle card, con la cascata solo quando i risultati arrivano dalla rete.
- Durante il caricamento: 12 skeleton nella griglia, contenitore con `aria-busy`, "Caricamento…" per i lettori di schermo.

## Dettaglio

- **Intestazione:** padding 24px sopra e 56px sotto. Link "← Torna indietro" (`small`, ciano, altezza minima 44px). Da 768px griglia `minmax(12rem, 18rem) 1fr` con spazio di 32px, allineata in basso: copertina a sinistra (al massimo 18rem, raggio 12px, alone `box-shadow: 0 28px 64px -12px` nel colore della tabella della tinta, che resta nei 32px di spazio), a destra etichetta, titolo in `display`, metadati in `small` (episodi, durata, studio, prossimo episodio in ciano: entro 6 giorni giorno della settimana e ora, oltre anche la data, "Ep. 1181 · dom 3 gen, 15:16") e pulsante primario "Aggiungi alla lista" / "✓ Nella mia lista". Dietro, tinta forte e kanji.
- **Corpo in due colonne da 1024px:**
  - colonna principale (al massimo 65 caratteri per riga): Trama, Generi, Prossimi episodi;
  - colonna laterale di 20rem (`<aside aria-label="Scheda">`), che resta visibile scorrendo (`position: sticky; top: 88px`, cioè header più 24px): pannelli "Informazioni" (formato, episodi, durata, stagione, titolo originale) e "Studi", su `surface`, raggio 12px, padding 20px × 24px, spazio di 16px tra i pannelli, titoli in `h3`. Le informazioni sono un `<dl>` a due colonne (`max-content 1fr`, spazio 8px × 24px), etichette in `ink-muted`, valori con `tabular-nums`. In fondo alla colonna, solo quando i dati superano la durata della loro cache, la nota "Dati aggiornati alle {ora}." di ADR-0003 in `small` `ink-muted`.
  - Spazio tra le due colonne 64px, tra le sezioni della colonna principale 56px; padding del corpo 64px sopra e 96px sotto.
  - Sotto i 1024px la colonna laterale va dopo quella principale.
- **Generi:** chip con la tinta della copertina (vedi la tabella della tinta).
- **Prossimi episodi:** elenco ordinato (`<ol>`) dei prossimi episodi non ancora andati in onda, al massimo 4.
  - **Dati: il palinsesto di AniList**, nella stessa richiesta del Dettaglio (cache di 1 ora, ADR-0003): `Media.airingSchedule(notYetAired: true, perPage: 4) { nodes { episode airingAt } }`. Verificato nello schema: `airingSchedule(notYetAired: Boolean, page: Int, perPage: Int)` con `perPage` al massimo 25, `AiringSchedule.episode: Int!` e `airingAt: Int!` (istante in secondi Unix). Lo schema non garantisce l'ordine: gli episodi si ordinano per `airingAt`. Nessuna data viene stimata o calcolata a intervalli fissi.
  - I dati possono avere fino a 1 ora: nel browser si scartano gli episodi con `airingAt` già passato al momento della visualizzazione. Se non ne resta nessuno, o AniList non ne fornisce: "Nessun episodio in programma."
  - **Righe:** numero dell'episodio, giorno e ora (`<time datetime>` con l'istante ISO), distanza relativa ("tra 2 ore", "tra 7 giorni", con `Intl.RelativeTimeFormat`). Ogni riga è una griglia `5rem 1fr auto` con spazio di 16px, padding verticale 12px e bordo inferiore `border`; numero in peso 600, distanza in `small` `ink-muted`, tutto con `tabular-nums`. Il primo episodio è in ciano, con prefisso "Prossimo:" per i lettori di schermo.
  - **Fuso orario reale del browser, mai un valore fisso.** Sopra l'elenco: "Messa in onda in Giappone, nel fuso del tuo browser ({fuso})." dove `{fuso}` è `Intl.DateTimeFormat().resolvedOptions().timeZone`, letto nel browser di chi guarda (per esempio "Europe/Rome" in Italia, "Asia/Tokyo" in Giappone).
  - **Formattazione nel browser:** il server non conosce il fuso del visitatore, quindi invia solo gli istanti (`airingAt`); giorno, ora, distanza relativa e nome del fuso si calcolano nel browser con `Intl.DateTimeFormat` senza fuso esplicito. Calcolarli sul server darebbe orari sbagliati e differenze tra HTML del server e del client. Finché il browser non li ha calcolati, le righe mostrano uno stato di attesa della stessa altezza, per non spostare il layout.
  - I test della formattazione usano fusi espliciti (vedi `CLAUDE.md`).

## Card dell'anime

Usata in Home, Ricerca e Lista.

```
┌──────────────────────┐  surface + tinta OKLCH, raggio 12px
│                [ + ] │  pulsante scuro semitrasparente, 44×44px
│      copertina       │  aspect-ratio 2/3, object-fit: cover
│                      │
│ [Ep. 7 · mer 16:30]  │  badge ciano, solo se c'è un prossimo episodio
├──────────────────────┤
│ TV · AUTUNNO 2026    │  label, text-muted
│ Titolo dell'anime su │  h3, al massimo 2 righe, poi …
│ due righe al massimo │
│ 12 episodi           │  small, text-muted
└──────────────────────┘  padding testo 12px, spazio interno 4px
```

Nella lista, sotto il numero di episodi, una riga in `small` `ink-muted` con stato (solo nel filtro "Tutti"), episodi visti e voto, sempre con un decimale: "Sto guardando · 5 visti · voto 8,5". Nella lista dell'utente collegato, sotto quella riga, i pulsanti "+1" (solo per "Sto guardando" e "In rewatch", finché ci sono episodi) e "Modifica", sopra il link esteso della card.

### Modifica di una voce

- `<dialog>` modale nativo (focus intrappolato, Esc chiude, al chiudersi il focus torna al pulsante che l'ha aperto): fondo `surface`, bordo `border`, raggio 12px, padding 24px, largo al massimo 28rem; dietro, la pagina scurita al 60%.
- Campi con etichetta visibile: Stato, Episodi visti (con il totale), Voto (campo di testo con la virgola o il punto, da 1,0 a 10,0 con un decimale, vuoto per nessun voto; un valore non valido blocca il salvataggio con un messaggio collegato al campo), Note. Pulsanti "Salva" (primario), "Annulla" e, per una voce esistente, "Elimina dalla lista" in `danger`.
- **Eliminazione:** "Elimina dalla lista" sostituisce i pulsanti con la domanda "Eliminare «Titolo» dalla lista su AniList? Non si può annullare." e i pulsanti "Elimina" e "Non eliminare"; il focus va sulla domanda.
- **Errore di salvataggio:** la voce torna com'era e in basso a sinistra compare un riquadro `role="alert"` con bordo `danger`, il messaggio e "Chiudi". Resta finché non si chiude o non si fa un'altra modifica.

### Semantica e accessibilità

- `<article>` con il titolo come `<h3>` che contiene il link al Dettaglio. Il link si estende a tutta la card con un pseudo-elemento, così l'intera card è cliccabile senza annidare elementi interattivi.
- Il pulsante "+" è un `<button>` separato, sopra il link, con `aria-pressed` che indica se l'anime è nella lista e nome accessibile completo ("*Titolo*: nella mia lista").
  - **Comportamento (M2):** premuto aggiunge l'anime a "Da vedere"; premuto di nuovo apre la conferma "Eliminare «Titolo» dalla lista su AniList? Non si può annullare." con "Elimina" e "Non eliminare" (ADR-0004: eliminazione solo dopo una conferma). Per cambiare stato, episodi o voto c'è il Dettaglio.
  - **Senza login** è un link a `/accesso`, con nome "Accedi con AniList per aggiungere «Titolo» alla tua lista" (ADR-0004).
  - Nel Dettaglio il pulsante primario "Aggiungi alla lista" apre la modifica della voce, per scegliere subito lo stato; da voce esistente diventa "✓ Nella mia lista", con accanto stato, episodi visti e voto. Senza login porta all'accesso, con la nota "Serve l'accesso con AniList.".
- La copertina ha `alt=""`: il titolo è già accanto.
- Il badge "in onda" ha un prefisso per lettori di schermo ("Prossimo episodio:") e non intercetta i clic.
- La copertina ha proporzioni fisse anche prima del caricamento: nessuno spostamento del layout.

### Pulsante "+"

| Stato | Aspetto |
|---|---|
| Riposo | Fondo `bg` al 72% di opacità, bordo `ink` al 24%, icona "+" in `ink`. Contrasto dell'icona nel caso peggiore (sopra una copertina bianca): **7,13** |
| Hover o focus | Fondo `pink`, icona `on-accent`; con il focus anche l'anello `cyan` con bordo interno `bg` |
| Nella lista | Fondo `pink`, icona ✓ in `on-accent`, che compare con un piccolo rimbalzo (`--spring-bouncy`) |
| Premuto | Scala a 0,9 |

### Badge "in onda"

Testo `cyan` su fondo `bg` pieno (12,36:1), in basso a sinistra sulla copertina: "Ep. 7 · mer 16:30". Il giorno della settimana basta solo se l'episodio esce entro 6 giorni, altrimenti un episodio tra 45 giorni sembrerebbe della settimana in corso. Oltre i 6 giorni il badge mostra solo la data, senza giorno della settimana né ora ("Ep. 1181 · 3 gen"), così resta su una riga; l'orario completo è nel Dettaglio. Giorno e ora sono nel fuso del browser, calcolati nel browser (come per i prossimi episodi del Dettaglio) da `nextAiringEpisode.airingAt` (verificato nello schema: `AiringSchedule.airingAt: Int!`, `episode: Int!`).

### Stati della card

| Stato | Aspetto | Movimento |
|---|---|---|
| Riposo | Come lo schema sopra | — |
| Hover (solo con puntatore preciso) | La card si solleva di 6px e si inclina leggermente verso il puntatore (massimo 6°); compare il bagliore | `transform` della card, `opacity` del bagliore |
| Focus da tastiera (`:focus-visible` sul link) | Anello `cyan` di 2px con scostamento di 3px attorno a tutta la card, sollevamento senza inclinazione | L'anello compare **subito** |
| Premuto | La card scala a 0,97 | 100ms |
| Caricamento (skeleton) | Stessa sagoma: rettangolo 2/3 e due barre in `raised`, nessuna tinta | Riflesso che scorre (`transform`), 1,4s in ciclo; compare dopo 150ms per non lampeggiare |
| Copertina mancante | Area della copertina in `raised`, iniziale del titolo in `ink-muted` a dimensione `display`; card senza tinta | — |

Durante il caricamento il contenitore ha `aria-busy="true"` e un testo per lettori di schermo ("Caricamento…"); gli skeleton sono `aria-hidden`.

### Come si compongono le trasformazioni

- La card ha un solo `transform`, composto da variabili: `perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)) translateY(var(--y)) scale(var(--s))`, con transizione di 400ms `--spring-snappy`. Hover e focus cambiano `--y`, la pressione `--s`, l'inclinazione `--rx` e `--ry`.
- **Inclinazione:** solo con `(hover: hover) and (pointer: fine)` e puntatore di tipo mouse. Gli angoli si calcolano dalla posizione del puntatore nella card, una volta per frame (`requestAnimationFrame`); mentre il puntatore si muove la transizione è di 120ms `--ease-out`, quando esce le variabili si azzerano e la card torna in piano con la molla. Il focus da tastiera solleva la card senza inclinarla.
- **Bagliore:** pseudo-elemento dietro la card con `box-shadow: 0 18px 44px -10px` nel colore della tabella della tinta; si anima solo la sua opacità (150ms `--ease-out`).
- **Cascata:** l'animazione d'ingresso usa `animation-fill-mode: backwards`, così, finita l'animazione, il `transform` torna a quello della card e hover e inclinazione funzionano. Parte quando arriva una nuova griglia di risultati, non quando si torna indietro dal Dettaglio.

## Movimento

Solo strumenti nativi del browser: transizioni e animazioni CSS, `linear()`, View Transitions API, animazioni guidate dallo scroll. Nessuna libreria. Se in un punto non bastano, si propone una modifica all'ADR-0001 prima di installare qualcosa.

### Durate

| Token | Valore | Uso |
|---|---|---|
| `--duration-instant` | 100ms | Pressione, cambi di colore |
| `--duration-fast` | 150ms | Hover, bagliore, comparsa di elementi piccoli |
| `--duration-base` | 250ms | Dissolvenze, entrata della pagina |
| `--duration-slow` | 400ms | Molle: card → Dettaglio, riposizionamento, indicatore di navigazione, titoli |

- Una singola animazione dura al massimo **400ms**; una sequenza a cascata al massimo **500ms**.
- Le molle percorrono la maggior parte della strada nel primo terzo: la durata include la coda di assestamento, quasi impercettibile.
- Nessuna animazione blocca i clic: `::view-transition { pointer-events: none; }`.

### Curve

| Token | Valore | Uso |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Dissolvenze in entrata, bagliore |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Uscite |
| `--spring-gentle` | molla smorzata, ζ 0,9, **nessun rimbalzo** | Entrate: cascata delle card, titoli, card → Dettaglio |
| `--spring-snappy` | molla, ζ 0,7, **rimbalzo 4,6%** | Riposizionamento, sollevamento della card, indicatore di navigazione |
| `--spring-bouncy` | molla, ζ 0,55, **rimbalzo 12,6%** | Solo piccoli riscontri: icona ✓, pulsanti premuti |

Le molle sono campionate in `linear()` (15–19 punti ciascuna):

```css
--spring-gentle: linear(0, 0.005 2%, 0.018 4%, 0.08 9%, 0.158 13.5%, 0.424 27%, 0.559 34.5%, 0.687 43%, 0.785 51.5%, 0.865 61%, 0.922 71%, 0.945 77%, 0.965 84%, 0.989 99.5%, 1);
--spring-snappy: linear(0, 0.008 2%, 0.031 4%, 0.119 8.5%, 0.564 24%, 0.749 31.5%, 0.87 38%, 0.919 41.5%, 0.959 45%, 0.993 49%, 1.02 53.5%, 1.036 58%, 1.045 63.5%, 1.045 69.5%, 1.039 77%, 1.011 99.5%, 1);
--spring-bouncy: linear(0, 0.008 1.5%, 0.038 3.5%, 0.136 7%, 0.673 20%, 0.88 26%, 1.013 31.5%, 1.055 34%, 1.091 37%, 1.12 41.5%, 1.126 44%, 1.125 47%, 1.105 53%, 1.025 68.5%, 0.998 76.5%, 0.987 83%, 0.984 90.5%, 0.988 99.5%, 1);
```

I valori vengono da un piccolo script che simula una molla smorzata e semplifica i punti; si rigenerano solo se si cambiano le molle.

### Effetti

| Effetto | Domanda | Come | Proprietà animate | Con movimento ridotto |
|---|---|---|---|---|
| Titoli display in entrata | Dove sono? | Ogni riga è in un contenitore con `overflow: hidden`; il testo, `inline-block`, sale da `translateY(100%)` in 400ms con `--spring-gentle`, 60ms tra una riga e l'altra | `transform` | Dissolvenza 150ms |
| Cascata delle card | Cosa è arrivato? | Salgono di 16px e da scala 0,97, 350ms, ritardo di 20ms per le prime 8 (fine entro 490ms) | `transform`, `opacity` | Dissolvenza 150ms, tutte insieme |
| Riposizionamento al cambio di filtro | Cosa è cambiato? | Ogni card ha un `view-transition-name` durante la transizione: quelle che restano scorrono nella nuova posizione (`--spring-snappy`), quelle nuove entrano da scala 0,92, quelle che escono si dissolvono in 150ms | gruppi delle View Transitions, `transform`, `opacity` | Nessun nome: solo dissolvenza della pagina |
| Card → Dettaglio | Da dove arriva? | La copertina della card diventa la copertina del Dettaglio (stesso `name`), `--spring-gentle`, 400ms; il resto si dissolve | gruppo della View Transition | Solo dissolvenza |
| Indicatore della pagina attiva | Dove sono? | La barretta sotto la voce attiva scorre verso la nuova voce, `--spring-snappy` | gruppo della View Transition | Cambia posto senza animazione |
| Inclinazione al passaggio del mouse | — (riscontro) | Segue il puntatore, massimo 6°, aggiornata una volta per frame; torna in piano con `--spring-snappy` | `transform` | Disattivata |
| Kanji all'apertura del Dettaglio | Dove sono? | Scorrono di 8% da destra e compaiono, 400ms, `--spring-gentle`, 80ms dopo la pagina | `transform`, `opacity` | Dissolvenza 150ms |
| Scroll nel Dettaglio | Dove sono nella pagina? | Copertina: `animation-timeline: scroll(root block)`, intervallo 0–70vh, fino a `translateY(18vh) scale(0.94)` e opacità 0,25. Kanji: stesso tipo di timeline, intervallo 0–80vh, fino a `translateY(30vh)` e opacità 0. Sezioni del corpo: `animation-timeline: view()`, intervallo `entry 10%`–`cover 30%`, da opacità 0 e `translateY(32px)`. Tutte con curva lineare e `animation-fill-mode: both`, dentro `@supports (animation-timeline: view())` e `@media (prefers-reduced-motion: no-preference)` | `transform`, `opacity` | Disattivate: tutto statico e visibile |
| Striscia "in onda ora" (Home) | Cosa sta andando in onda? | Scorre in orizzontale a circa 40px/s, in ciclo | `transform` | Ferma; si scorre a mano |
| Aggiunta alla lista | È andato a buon fine? | Il pulsante diventa rosa, la ✓ compare con `--spring-bouncy` | colore di fondo (eccezione), `transform` | Cambio immediato |

### Striscia "in onda ora"

Spostata in M7 (Passata di stile): in M3 la Home non la ha.

- **Posizione: una riga propria sotto l'header, a tutta la larghezza del contenuto, sia su mobile sia su desktop.** Contiene l'etichetta "In onda ora" (ciano, con un punto), la zona che scorre e il pulsante "Pausa / Riprendi". Altezza minima 44px, testo `small`.
- **Su desktop (da 1024px) mostra sempre almeno due voci intere contemporaneamente.** Ogni voce è "**Titolo** · Ep. 15 · sab 23:00" (orario formattato nel browser, nel suo fuso), su una riga, con 32px tra una voce e l'altra. A 1024px la zona pienamente visibile (tolte etichetta, pulsante e sfumature) è di circa 620px, quindi ogni voce è larga al massimo **18rem** (288px). Se il titolo non ci sta, si accorcia con i puntini (`text-overflow: ellipsis`) mentre numero dell'episodio e orario restano interi. I lettori di schermo leggono comunque il titolo completo, che resta nel testo della pagina.
- Contenuto duplicato per il ciclo continuo: la copia ha `aria-hidden="true"` e `inert`, quindi lettori di schermo e tastiera vedono gli elementi una volta sola. L'animazione sposta la traccia di `-50%` in ciclo.
- **Velocità costante** di circa 40px al secondo: la durata dell'animazione si calcola dalla larghezza del contenuto, non è fissa.
- **Bordi sfumati** con `mask-image` (64px per lato): il testo entra ed esce in dissolvenza, mai tagliato di netto. Con movimento ridotto la sfumatura resta e l'elenco ha 64px di margine ai lati, così il primo e l'ultimo elemento sono leggibili.
- Si mette in pausa con hover e con focus su un suo elemento.
- **Ha anche un pulsante "Pausa / Riprendi" visibile.** Serve per WCAG 2.2.2 (Pausa, stop, nascondi): un contenuto che si muove da solo per più di 5 secondi deve poter essere fermato da chiunque, non solo da chi usa il mouse.

### Cosa non si anima

- Il testo mentre si legge: niente contatori che salgono, niente testo che si scrive da solo.
- Il focus da tastiera: compare immediatamente.
- Parallasse solo per la copertina del Dettaglio; niente scorrimento dirottato, niente parallasse altrove.
- Animazioni in ciclo: solo il riflesso dello skeleton e la striscia "in onda", entrambi fermi con movimento ridotto.
- Proprietà che ricalcolano il layout (`width`, `height`, `top`, `margin`…) e i filtri (`blur`).

### View Transitions

- In Next.js 16.4 si usa il componente `<ViewTransition>` di React 19.3, che si appoggia alla View Transitions API del browser. Non serve nessun flag di configurazione (`experimental.viewTransition` è stato rimosso in Next 16.3). Fonte: `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`, versione installata.
- **Card → Dettaglio:** stesso `name` sulla copertina nelle due pagine (`cover-{id}`), con `share` esplicito e `default="none"`.
- **Filtro** (La mia lista, Calendario): ogni card ha un `name` (`card-{id}`) solo durante la transizione del filtro, per non far partecipare tutte le card a transizioni estranee.
- **Anime in evidenza della Home:** si comporta come una card anche per la transizione verso il Dettaglio e per il ritorno, compreso il focus.
- **Header fermo:** il gruppo `site-header` non ha animazione e sta sopra il resto (`z-index: 100`); la sua istantanea vecchia è nascosta, per non vedere due header sovrapposti.
- **Durate e curve:** uscita della pagina (`::view-transition-old(root)`) 0,7 × `--duration-base` con `--ease-in`; entrata (`::view-transition-new(root)`) `--duration-base` con `--ease-out`; gruppi con nome 400ms `--spring-snappy`, tranne la copertina (`--spring-gentle`). Elementi che entrano senza corrispondente (`::view-transition-new(*):only-child`): da scala 0,92 e opacità 0, 300ms `--spring-gentle`; elementi che escono senza corrispondente (`::view-transition-old(*):only-child`): verso scala 0,92 e opacità 0, 150ms `--ease-in`.
- **Focus dopo la navigazione:** va al titolo della nuova pagina (`tabindex="-1"`, senza anello perché non è interattivo); tornando indietro, al link della card da cui si era partiti. Il focus si sposta dentro l'aggiornamento della transizione, non prima.
- **Navigazione con il tasto Indietro del browser:** la trasformazione della copertina funziona se entrambe le pagine hanno lo stesso `name`.

### Supporto dei browser

Verificato a novembre 2026.

| Funzione | Chrome / Edge | Safari | Firefox | Dove non è supportata |
|---|---|---|---|---|
| View Transitions nella stessa pagina | 111 | 18 | 144 | Navigazione e filtro senza animazione |
| `linear()` per le molle | 113 | 17.2 | 112 | La variabile non è valida: si usa la curva predefinita del browser (`ease`) |
| Sintassi relativa dei colori (`oklch(from …)`) | Baseline 2024 | Baseline 2024 | Baseline 2024 | Card senza tinta, bagliore assente |
| Animazioni guidate dallo scroll (`animation-timeline`) | 115 | 26 | 159 (27 ottobre 2026) | Dettaglio statico, tutto visibile (regole dentro `@supports`) |
| `:has()` per l'anello attorno alla card | Baseline 2023 | Baseline 2023 | Baseline 2023 | Anello solo sul titolo |
| `mask-image` senza prefisso (bordi della striscia) | 120 | 15.4 | 53 | Bordi netti |
| Animazioni CSS (striscia, cascata, skeleton) | Ovunque | Ovunque | Ovunque | — |

Le animazioni guidate dallo scroll sono Baseline solo da poche settimane: chi ha un Firefox precedente alla 159 vede il Dettaglio statico, senza perdere niente.

### `prefers-reduced-motion`

Con `prefers-reduced-motion: reduce` si toglie lo **spostamento**, non il riscontro. Restano solo **dissolvenze brevi (al massimo 150ms)**:

- le molle diventano `ease-out` e le durate scendono a 150ms;
- niente sollevamento, inclinazione, scala, cascata, scorrimento o trasformazione della copertina;
- nelle View Transitions nessun elemento ha un nome: solo dissolvenza della pagina;
- animazioni guidate dallo scroll disattivate;
- skeleton fermo e striscia "in onda" ferma e scorrevole a mano.

## Budget di prestazioni

- **Solo `transform` e `opacity`** nelle animazioni scritte da noi.
- **Eccezioni dichiarate:**
  1. i gruppi delle View Transitions (card → Dettaglio, riposizionamento, indicatore), dove il browser interpola anche la dimensione sulle istantanee;
  2. il colore di fondo del pulsante "+" (150ms, elemento di 44px).
- `will-change` mai fisso; l'inclinazione aggiorna le variabili una volta per frame con `requestAnimationFrame`.
- Niente `backdrop-filter`; il bagliore è un'ombra disegnata una volta di cui si anima solo l'opacità.
- **Criterio:** ogni effetto si misura con **Chrome DevTools, CPU rallentata 4×** (Performance, riga "Frames"). Se perde frame si semplifica: il riposizionamento e la trasformazione card → Dettaglio diventano dissolvenze, l'inclinazione si toglie, le animazioni dello scroll si riducono alla sola opacità.
- **Stato della misura:** l'anteprima ha una vista "Misure" che esegue ogni effetto e registra i frame. La misura non è ancora valida: durante la prova il computer era sotto carico (load average 40, `brew upgrade` stava compilando LLVM) e anche la pagina ferma perdeva frame. Non si ripete sull'anteprima: si misura sull'app vera, a partire dalla transizione card → Dettaglio in M1 (decisione del 2026-11-19).
- Obiettivi generali: **INP ≤ 200ms**, **CLS ≤ 0,1**, **LCP ≤ 2,5s**; copertine con proporzioni dichiarate e caricamento differito sotto la piega; font precaricati da `next/font`, tranne quello giapponese.

## Token in Tailwind v4

I valori di questo documento diventano variabili in `@theme` dentro `src/app/globals.css`, così sono disponibili sia come classi Tailwind (es. `bg-surface`, `text-ink-muted`) sia come variabili CSS per la tinta, le molle e le View Transitions.

I colori del testo si chiamano `ink` e `ink-muted`: in Tailwind il prefisso `text-` vale sia per i colori sia per le dimensioni del testo, e un token di nome `text` darebbe classi come `text-text`.

## Da decidere o verificare più avanti

- **Misura con CPU 4× (M1):** ogni effetto sull'app vera, a macchina scarica, a partire dalla transizione card → Dettaglio (vedi budget).
- **Ottimizzazione delle copertine (M1):** `next/image` passa dall'ottimizzazione di Vercel, che sul piano gratuito ha limiti mensili; l'alternativa è `<img>` con gli URL di AniList, che offre già tre dimensioni (`medium`, `large`, `extraLarge`).
- **Noto Sans JP:** byte scaricati su un sistema senza font giapponesi e spazio nella build.
- **Pulsante "+" (M2):** cosa succede premendolo quando l'anime è già nella lista.
- **Spazio della prima fila nella Home:** verificato in M3 (775px senza la striscia, vedi "Home"); da rifare quando la striscia arriva in M7.
