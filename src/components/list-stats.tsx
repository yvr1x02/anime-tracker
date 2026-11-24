import { EmptyList } from "@/components/empty-list";
import { ScoreChart } from "@/components/score-chart";
import { genreLabel, genreLang, listStatusLabel } from "@/lib/anime-labels";
import type { ListEntry } from "@/lib/list";
import { formatScore } from "@/lib/score";
import { type Ranked, listStats } from "@/lib/stats";

const wholeNumber = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });

/** Statistiche (SPEC, docs/DESIGN.md "Statistiche"), from a list already read: no requests of its own. */
export function ListStats({ entries, own = false }: { entries: ListEntry[]; own?: boolean }) {
  if (entries.length === 0) {
    return (
      <p className="mt-8 text-ink-muted">
        <EmptyList own={own} />
      </p>
    );
  }

  const stats = listStats(entries);
  const numbers = [
    { label: "Episodi visti", value: wholeNumber.format(stats.episodes) },
    { label: "Ore guardate", value: wholeNumber.format(stats.minutes / 60) },
    { label: "Voto medio", value: stats.averageScore === null ? "—" : formatScore(stats.averageScore) },
  ];

  return (
    <>
      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {numbers.map(({ label, value }) => (
          <div key={label} className="flex flex-col-reverse rounded-panel bg-surface px-5 py-4">
            <dt className="text-small text-ink-muted">{label}</dt>
            <dd className="text-h2 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {stats.withoutDuration > 0 && (
        <p className="mt-3 text-small text-ink-muted">
          {stats.withoutDuration === 1
            ? "1 anime senza durata su AniList non è conteggiato nelle ore."
            : `${stats.withoutDuration} anime senza durata su AniList non sono conteggiati nelle ore.`}
        </p>
      )}
      {stats.averageScore === null && <p className="mt-3 text-small text-ink-muted">Nessun anime ha un voto.</p>}

      <section aria-labelledby="per-stato" className="mt-10">
        <h2 id="per-stato" className="text-h2">
          Anime per stato
        </h2>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {stats.byStatus.map(({ status, count }) => (
            <div key={status} className="flex gap-2">
              <dt className="text-ink-muted">{listStatusLabel[status]}</dt>
              <dd className="font-semibold tabular-nums">{count}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <ScoreChart counts={stats.scores} href={(score) => `/lista?voto=${score}`} />
        <GenreChart genres={stats.genres} />
      </div>

      <section aria-labelledby="studi" className="mt-10">
        <h2 id="studi" className="text-h2">
          Studi più presenti
        </h2>
        {stats.studios.length === 0 ? (
          <p className="mt-4 text-ink-muted">AniList non indica lo studio degli anime visti.</p>
        ) : (
          <ol className="mt-4 list-inside list-decimal space-y-1">
            {stats.studios.map(({ name, count }) => (
              <li key={name}>
                {name} <span className="text-ink-muted tabular-nums">· {count} anime</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

/** docs/DESIGN.md, "Grafici": the table is the chart; its bars only repeat the numbers beside them. */
function GenreChart({ genres }: { genres: Ranked[] }) {
  const highest = genres[0]?.count ?? 0;

  return (
    <section aria-labelledby="generi">
      <h2 id="generi" className="text-h2">
        Generi più visti
      </h2>
      {genres.length === 0 ? (
        <p className="mt-4 text-ink-muted">Nessun genere: la lista non ha ancora anime visti.</p>
      ) : (
        <table className="mt-4 w-full text-small">
          <caption className="sr-only">I primi {genres.length} generi per numero di anime</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Genere</th>
              <th scope="col">Anime</th>
            </tr>
          </thead>
          <tbody>
            {genres.map(({ name, count }) => (
              <tr key={name}>
                <th scope="row" lang={genreLang(name)} className="w-0 whitespace-nowrap py-1 pr-4 text-left font-normal">
                  {genreLabel(name)}
                </th>
                <td className="py-1">
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className="h-3 flex-1 rounded-sm bg-raised">
                      <span className="block h-full rounded-sm bg-ink-muted" style={{ width: `${(count / highest) * 100}%` }} />
                    </span>
                    <span className="w-8 text-right tabular-nums">{count}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
