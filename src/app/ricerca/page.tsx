import type { Metadata } from "next";
import { connection } from "next/server";
import { pageContainer } from "@/lib/page-container";
import { AnimeSearch } from "./anime-search";

export const metadata: Metadata = {
  title: "Ricerca",
};

export default async function SearchPage() {
  // Rendered per request so the field shows ?q= from the first HTML; nothing here calls AniList (ADR-0003).
  await connection();

  return (
    <div className={`${pageContainer} py-12`}>
      <h1 className="text-h1">Ricerca</h1>
      <AnimeSearch />
    </div>
  );
}
