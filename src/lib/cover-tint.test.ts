import { describe, expect, it } from "vitest";
import { coverTintProps, validCoverColor } from "./cover-tint";

describe("validCoverColor", () => {
  it.each(["#e4a15d", "#E4A15D", "#000000"])("accepts %s", (color) => {
    expect(validCoverColor(color)).toBe(color);
  });

  it.each([
    null,
    undefined,
    "",
    "#fff",
    "e4a15d",
    "#e4a15g",
    "#e4a15d80",
    "red",
    "#e4a15d; background: url(https://example.test/x)",
    "#e4a15d\n",
    "var(--pink)",
  ])("rejects %j", (color) => {
    expect(validCoverColor(color)).toBeNull();
  });
});

describe("coverTintProps", () => {
  it("sets the cover variable for a valid color", () => {
    expect(coverTintProps("#e4a15d")).toEqual({ className: "has-cover", style: { "--cover": "#e4a15d" } });
  });

  it("returns nothing for an invalid color, so no tint is drawn", () => {
    expect(coverTintProps("red; color: red")).toEqual({});
  });
});
