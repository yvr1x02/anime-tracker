import { describe, expect, it } from "vitest";
import {
  formatAiringDate,
  formatCardAiring,
  formatAiringDistance,
  formatAiringShort,
  formatNextAiring,
  toISO,
  upcomingEpisodes,
} from "./airing";

const at = (iso: string) => Date.parse(iso) / 1000;
const now = Date.parse("2026-11-19T12:00:00Z");

describe("upcomingEpisodes", () => {
  it("drops aired episodes, sorts by airing time and keeps at most four", () => {
    const nodes = [
      { episode: 9, airingAt: at("2026-12-10T15:30:00Z") },
      null,
      { episode: 5, airingAt: at("2026-11-19T11:59:00Z") },
      { episode: 6, airingAt: at("2026-11-19T15:30:00Z") },
      { episode: 8, airingAt: at("2026-12-03T15:30:00Z") },
      { episode: 7, airingAt: at("2026-11-26T15:30:00Z") },
      { episode: 10, airingAt: at("2026-12-17T15:30:00Z") },
    ];

    expect(upcomingEpisodes(nodes, now).map((e) => e.episode)).toEqual([6, 7, 8, 9]);
  });

  it("drops an episode airing exactly now", () => {
    expect(upcomingEpisodes([{ episode: 1, airingAt: now / 1000 }], now)).toEqual([]);
  });

  it("handles a missing schedule", () => {
    expect(upcomingEpisodes(null, now)).toEqual([]);
    expect(upcomingEpisodes(undefined, now)).toEqual([]);
  });
});

describe("formatAiringDate", () => {
  const instant = at("2026-11-26T15:30:00Z");

  it("shows the same instant in the viewer's time zone", () => {
    expect(formatAiringDate(instant, "Europe/Rome")).toBe("gio 26 nov, 16:30");
    expect(formatAiringDate(instant, "Asia/Tokyo")).toBe("ven 27 nov, 00:30");
    expect(formatAiringDate(instant, "America/New_York")).toBe("gio 26 nov, 10:30");
  });

  it("follows daylight saving time", () => {
    expect(formatAiringDate(at("2026-07-02T15:30:00Z"), "Europe/Rome")).toBe("gio 2 lug, 17:30");
  });

  it("has a short form for compact places", () => {
    expect(formatAiringShort(instant, "Europe/Rome")).toBe("gio 16:30");
  });
});

describe("formatNextAiring", () => {
  it("uses weekday and time within six days", () => {
    expect(formatNextAiring(at("2026-11-24T15:30:00Z"), now, "Europe/Rome")).toBe("mar 16:30");
  });

  it("adds the date from six days ahead, when the weekday could be today's", () => {
    expect(formatNextAiring(at("2026-11-26T11:00:00Z"), now, "Europe/Rome")).toBe("gio 26 nov, 12:00");
  });

  it("adds the date further ahead, where a bare weekday would mislead", () => {
    expect(formatNextAiring(at("2027-01-03T14:16:00Z"), now, "Europe/Rome")).toBe("dom 3 gen, 15:16");
  });
});

describe("formatCardAiring", () => {
  it("uses weekday and time within six days, like the header", () => {
    expect(formatCardAiring(at("2026-11-24T15:30:00Z"), now, "Europe/Rome")).toBe("mar 16:30");
  });

  it("shows only the date from six days ahead, to stay on one line", () => {
    expect(formatCardAiring(at("2026-11-26T11:00:00Z"), now, "Europe/Rome")).toBe("26 nov");
    expect(formatCardAiring(at("2027-01-03T14:16:00Z"), now, "Europe/Rome")).toBe("3 gen");
  });

  it("takes the date in the given time zone", () => {
    const lateEvening = at("2027-01-02T23:30:00Z");
    expect(formatCardAiring(lateEvening, now, "Europe/Rome")).toBe("3 gen");
    expect(formatCardAiring(lateEvening, now, "America/New_York")).toBe("2 gen");
  });
});

describe("formatAiringDistance", () => {
  it.each([
    ["2026-11-19T12:45:00Z", "tra 45 minuti"],
    ["2026-11-19T14:00:00Z", "tra 2 ore"],
    ["2026-11-20T12:00:00Z", "domani"],
    ["2026-11-26T12:00:00Z", "tra 7 giorni"],
  ])("%s is %s", (iso, expected) => {
    expect(formatAiringDistance(at(iso), now)).toBe(expected);
  });
});

it("gives the ISO instant for <time datetime>", () => {
  expect(toISO(at("2026-11-26T15:30:00Z"))).toBe("2026-11-26T15:30:00.000Z");
});
