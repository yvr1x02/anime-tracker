import Link from "next/link";

type Props = { counts: number[] } & (
  | { selected: number | null; onSelect: (score: number | null) => void }
  | { href: (score: number) => string }
);

/**
 * "Distribuzione dei voti" (docs/DESIGN.md, "Grafici"), drawn in HTML (ADR-0001): one column per score from
 * 1 to 10. With onSelect each column is a filter button, pressed again to clear it (La mia lista); with href
 * a link (Statistiche). The same numbers sit in a table for whoever does not see the chart.
 */
export function ScoreChart(props: Props) {
  const { counts } = props;
  const highest = Math.max(...counts);

  const columns = counts.map((count, index) => {
    const score = index + 1;
    const pressed = "onSelect" in props && props.selected === score;
    const content = (
      <>
        <span className="tabular-nums">{count}</span>
        <span aria-hidden="true" className="flex w-full flex-1 items-end rounded-sm bg-raised">
          <span
            className={`w-full rounded-sm ${pressed ? "bg-ink" : "bg-ink-muted"}`}
            // Bars scale to the most frequent score; one with any anime stays visible.
            style={{ height: count ? `max(2px, ${(count / highest) * 100}%)` : 0 }}
          />
        </span>
        <span className="tabular-nums">{score}</span>
      </>
    );
    const className = `score-column ${pressed ? "border-ink font-bold" : "border-transparent"}`;

    return "onSelect" in props ? (
      <button
        key={score}
        type="button"
        aria-pressed={pressed}
        aria-label={`Voto ${score}: ${count} anime`}
        onClick={() => props.onSelect(pressed ? null : score)}
        className={className}
      >
        {content}
      </button>
    ) : (
      <Link key={score} href={props.href(score)} aria-label={`Voto ${score}: ${count} anime, apri La mia lista`} className={className}>
        {content}
      </Link>
    );
  });

  return (
    <section aria-labelledby="distribuzione-voti" className="max-w-2xl">
      <h2 id="distribuzione-voti" className="text-h2">
        Distribuzione dei voti
      </h2>
      <div className="score-chart" {...("onSelect" in props && { role: "group", "aria-label": "Filtra per voto" })}>
        {columns}
      </div>
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
