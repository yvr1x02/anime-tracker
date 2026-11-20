import { describe, expect, it } from "vitest";
import { genreLabel } from "./anime-labels";

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
