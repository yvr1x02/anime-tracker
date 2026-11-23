import Link from "next/link";

const loginLink = (path: string) => `/accesso?da=${encodeURIComponent(path)}`;

/** SPEC, "Accesso": the notice above a page showing the demo profile's list, which links to the login. */
export function DemoNotice({ userName, path }: { userName: string; path: string }) {
  return (
    <p className="mt-6 max-w-2xl rounded-panel bg-surface px-5 py-4">
      Modalità demo: lista pubblica di {userName} su AniList, in sola lettura.{" "}
      <Link href={loginLink(path)} className="text-cyan underline underline-offset-2">
        Accedi con AniList
      </Link>{" "}
      per vedere e modificare la tua.
    </p>
  );
}

/** In place of the page when the demo profile is not set, does not exist or is not public. */
export function DemoUnavailable({ path }: { path: string }) {
  return (
    <p className="mt-6 max-w-2xl text-ink-muted">
      La lista dimostrativa non è disponibile in questo momento.{" "}
      <Link href={loginLink(path)} className="text-cyan underline underline-offset-2">
        Accedi con AniList
      </Link>{" "}
      per vedere la tua.
    </p>
  );
}
