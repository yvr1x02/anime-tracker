import Link from "next/link";

const link = "text-cyan underline underline-offset-2";

/**
 * An empty list says what to do next, as Cosa guardo stasera? does; the demo list, read only, just says it is
 * empty. Used where the whole list is empty, not when a filter leaves nothing.
 */
export function EmptyList({ own }: { own: boolean }) {
  if (!own) return <>La lista è vuota.</>;
  return (
    <>
      La lista è vuota: aggiungi qualcosa dalla{" "}
      <Link href="/ricerca" className={link}>
        Ricerca
      </Link>{" "}
      o dagli{" "}
      <Link href="/" className={link}>
        anime della stagione
      </Link>
      .
    </>
  );
}
