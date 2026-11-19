import { describe, expect, it } from "vitest";
import { descriptionToParagraphs } from "./description";

describe("descriptionToParagraphs", () => {
  it("returns no paragraphs for a missing description", () => {
    expect(descriptionToParagraphs(null)).toEqual([]);
    expect(descriptionToParagraphs(undefined)).toEqual([]);
    expect(descriptionToParagraphs("  <br><br>  ")).toEqual([]);
  });

  it("splits paragraphs on double <br>, counting AniList's <br> plus newline once", () => {
    expect(descriptionToParagraphs("Primo paragrafo.<br><br>\nSecondo paragrafo.")).toEqual([
      "Primo paragrafo.",
      "Secondo paragrafo.",
    ]);
  });

  it("keeps a single <br> as a line break inside the paragraph", () => {
    expect(descriptionToParagraphs("Riga uno<br>\nriga due<br />riga tre")).toEqual([
      "Riga uno\nriga due\nriga tre",
    ]);
  });

  it("removes formatting tags and keeps their text", () => {
    expect(descriptionToParagraphs("Un <i>anime</i> <b>breve</b>.")).toEqual(["Un anime breve."]);
  });

  it("decodes named and numeric entities once", () => {
    expect(descriptionToParagraphs("Tom &amp; Jerry &mdash; &#8220;ciao&#x201D; &amp;lt;b&amp;gt;")).toEqual([
      "Tom & Jerry — “ciao” &lt;b&gt;",
    ]);
  });

  it("leaves unknown or invalid entities as text", () => {
    expect(descriptionToParagraphs("&unknown; &#0; &#xD800;")).toEqual(["&unknown; &#0; &#xD800;"]);
  });

  it("drops <script> elements together with their content", () => {
    expect(descriptionToParagraphs('Prima<script>alert("x")</script> dopo<SCRIPT src="x.js"></SCRIPT>.')).toEqual([
      "Prima dopo.",
    ]);
  });

  it("drops tags with event handler attributes such as onerror", () => {
    const result = descriptionToParagraphs('Testo <img src=x onerror="alert(1)"> e <a href="javascript:alert(1)">link</a>.');
    expect(result).toEqual(["Testo e link."]);
    expect(result.join()).not.toMatch(/onerror|javascript:|</);
  });

  it("turns encoded markup into visible text, not markup", () => {
    expect(descriptionToParagraphs("&lt;script&gt;alert(1)&lt;/script&gt;")).toEqual(["<script>alert(1)</script>"]);
  });

  it("removes AniList spoilers", () => {
    expect(descriptionToParagraphs("Inizio. ~!Il colpevole è lui.!~ Fine.")).toEqual(["Inizio. Fine."]);
  });

  it("removes HTML comments", () => {
    expect(descriptionToParagraphs("A<!-- nota -->B")).toEqual(["AB"]);
  });
});
