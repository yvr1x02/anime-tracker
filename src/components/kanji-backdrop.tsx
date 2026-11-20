import { Noto_Sans_JP } from "next/font/google";

// Fallback only, after the system Japanese fonts: never preloaded, and dropped if it is not there in time.
const notoSansJP = Noto_Sans_JP({
  weight: "700",
  preload: false,
  display: "optional",
  variable: "--font-noto-jp",
});

/** The native title as a giant vertical backdrop: decoration only, so hidden from assistive tech. */
export function KanjiBackdrop({ text }: { text: string }) {
  return (
    <div aria-hidden="true" className={`kanji-backdrop ${notoSansJP.variable}`}>
      <span lang="ja" className="text-native">
        {text}
      </span>
    </div>
  );
}
