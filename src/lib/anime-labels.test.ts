import { describe, expect, it } from "vitest";
import { genreLabel, genreLang } from "./anime-labels";

describe("genreLabel", () => {
  it.each([
    ["Action", "Azione"],
    ["Sci-Fi", "Fantascienza"],
    ["Slice of Life", "Vita quotidiana"],
  ])("translates %s", (genre, label) => {
    expect(genreLabel(genre)).toBe(label);
  });

  it.each(["Isekai", "constructor", "toString", ""])("keeps a genre missing from the table: %j", (genre) => {
    expect(genreLabel(genre)).toBe(genre);
  });
});

describe("genreLang", () => {
  // Fantasy keeps its English spelling but is in the table: Italian uses the word as is.
  it.each(["Action", "Fantasy"])("leaves %s in the page's language", (genre) => {
    expect(genreLang(genre)).toBeUndefined();
  });

  it.each(["Isekai", "constructor"])("marks %s, missing from the table, as English", (genre) => {
    expect(genreLang(genre)).toBe("en");
  });
});
