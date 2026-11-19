import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anime Tracker",
  description: "Tracker personale di anime basato sui dati di AniList.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
