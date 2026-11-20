const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/**
 * Turns an AniList description (markdown mode: `<br>`, `<i>`, entities) into plain-text paragraphs.
 * The result is always rendered as React text, never as HTML: stripping tags here is for readability,
 * escaping is what keeps it safe. Single line breaks stay inside a paragraph as "\n".
 */
export function descriptionToParagraphs(description: string | null | undefined): string[] {
  if (!description) return [];

  const text = description
    .replace(/\r\n?/g, "\n")
    // AniList spoiler markup: never shown unasked.
    .replace(/~![\s\S]*?!~/g, "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // AniList writes "<br>" followed by a real newline; count the pair once.
    .replace(/<br\s*\/?>[ \t]*\n?/gi, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, "");

  return decodeEntities(text)
    .split(/\n[ \t ]*\n/)
    .map((paragraph) => paragraph.replace(/[ \t]{2,}/g, " ").replace(/ *\n */g, "\n").trim())
    .filter(Boolean);
}

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return NAMED_ENTITIES[code] ?? entity;
    const hex = code[1] === "x" || code[1] === "X";
    const point = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
    const valid = point > 0 && point <= 0x10ffff && (point < 0xd800 || point > 0xdfff);
    return valid ? String.fromCodePoint(point) : entity;
  });
}
