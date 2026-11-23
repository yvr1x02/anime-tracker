import Link from "next/link";

/**
 * "Distribuzione dei voti" of Statistiche (docs/DESIGN.md, "Grafici"), drawn in HTML (ADR-0001): one column
 * per score from 1 to 10, each a link to La mia lista filtered on it. The same numbers sit in a table for
 * whoever does not see the chart.
 */
export function ScoreChart({ counts, href }: { counts: number[]; href: (score: number) => string }) {
  const highest = Math.max(...counts);

  const columns = counts.map((count, index) => {
    const score = index + 1;
    // Score, then count, as words in the name "Voto 8: 12 anime" (WCAG 2.5.3); .score-column shows them reversed.
    return (
      <Link
        key={score}
        href={href(score)}
        aria-label={`Voto ${score}: ${count} anime, apri La mia lista`}
        className="score-column border-transparent"
      >
        <span className="tabular-nums">{score}</span>{" "}
        <span aria-hidden="true" className="flex w-full flex-1 items-end rounded-sm bg-raised">
          <span
            className="w-full rounded-sm bg-ink-muted"
            // Bars scale to the most frequent score; one with any anime stays visible.
            style={{ height: count ? `max(2px, ${(count / highest) * 100}%)` : 0 }}
          />
        </span>{" "}
        <span className="tabular-nums">{count}</span>
      </Link>
    );
  });

  return (
    <section aria-labelledby="distribuzione-voti" className="max-w-2xl">
      <h2 id="distribuzione-voti" className="text-h2">
        Distribuzione dei voti
      </h2>
      <div className="score-chart">{columns}</div>
      <details className="mt-3">
        <summary className="cursor-pointer text-small text-ink-muted underline underline-offset-2">
          Dati del grafico in tabella
        </summary>
        <table className="mt-2 text-small tabular-nums">
          <caption className="sr-only">Distribuzione dei voti</caption>
          <thead>
            <tr>
              <th scope="col" className="pr-6 text-left font-semibold">
                Voto
              </th>
              <th scope="col" className="text-right font-semibold">
                Anime
              </th>
            </tr>
          </thead>
          <tbody>
            {counts.map((count, index) => (
              <tr key={index}>
                <td className="pr-6">{index + 1}</td>
                <td className="text-right">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
