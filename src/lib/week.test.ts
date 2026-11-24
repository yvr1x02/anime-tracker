import { describe, expect, it } from "vitest";
import {
  addDays,
  currentMonday,
  fullDayLabel,
  groupByDay,
  localDate,
  mondayOf,
  parseDayParam,
  parseWeekParam,
  tabLabel,
  weekRangeLabel,
  weekWindow,
} from "./week";

const at = (iso: string) => Date.parse(iso) / 1000;

describe("dates", () => {
  it("finds the Monday of a week, Sunday included", () => {
    expect(mondayOf("2026-11-23")).toBe("2026-11-23");
    expect(mondayOf("2026-11-29")).toBe("2026-11-23");
    expect(mondayOf("2027-01-01")).toBe("2026-12-28");
  });

  it("adds days across months, years and the end of daylight saving", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("takes today's date and week in the viewer's time zone", () => {
    // Sunday 29 November, 23:30 in Rome; already Monday 30 in Tokyo.
    const now = Date.parse("2026-11-29T22:30:00Z");
    expect(localDate(now, "Europe/Rome")).toBe("2026-11-29");
    expect(currentMonday(now, "Europe/Rome")).toBe("2026-11-23");
    expect(currentMonday(now, "Asia/Tokyo")).toBe("2026-11-30");
  });
});

describe("weekWindow", () => {
  it("covers the week in every time zone, UTC−12 to UTC+14", () => {
    expect(weekWindow("2026-11-23")).toEqual({
      from: at("2026-11-22T10:00:00Z"),
      to: at("2026-11-30T12:00:00Z"),
    });
  });
});

describe("parseWeekParam", () => {
  const utcMonday = "2026-11-23";

  it.each(["2026-11-23", "2026-11-16", "2027-02-22"])("accepts %s", (value) => {
    expect(parseWeekParam(value, utcMonday)).toBe(value);
  });

  it.each<[string | null, string]>([
    [null, "missing"],
    ["2026-11-24", "not a Monday"],
    ["2026-11-09", "two weeks back"],
    ["2027-03-01", "too far ahead"],
    ["2026-02-30", "not a date"],
    ["23-11-2026", "wrong format"],
    ["2026-11-23T00:00", "with a time"],
  ])("refuses %s (%s)", (value) => {
    expect(parseWeekParam(value, utcMonday)).toBeNull();
  });
});

describe("parseDayParam", () => {
  const utcMonday = "2026-11-23";

  it.each(["2026-11-23", "2026-11-26", "2026-11-17", "2027-02-28"])("accepts %s", (value) => {
    expect(parseDayParam(value, utcMonday)).toBe(value);
  });

  it.each<[string | null, string]>([
    [null, "missing"],
    ["2026-11-15", "a day two weeks back"],
    ["2027-03-01", "a day too far ahead"],
    ["2026-02-30", "not a date"],
    ["26-11-2026", "wrong format"],
    ["2026-11-26T00:00", "with a time"],
  ])("refuses %s (%s)", (value) => {
    expect(parseDayParam(value, utcMonday)).toBeNull();
  });
});

describe("groupByDay", () => {
  const monday = "2026-11-23";
  const episodes = [
    { id: "sunday-late", airingAt: at("2026-11-29T22:59:00Z") }, // 23:59 Sunday in Rome
    { id: "monday-tokyo-night", airingAt: at("2026-11-23T15:30:00Z") }, // Tue 00:30 Tokyo, Mon 16:30 Rome
    { id: "next-monday", airingAt: at("2026-11-29T23:00:00Z") }, // 00:00 Monday 30 in Rome
    { id: "before", airingAt: at("2026-11-22T22:00:00Z") }, // Sunday 23:00 in Rome, last week
  ];

  const ids = (timeZone: string) =>
    groupByDay(episodes, monday, timeZone).map(({ date, episodes: day }) => [date, day.map((e) => e.id)]);

  it("puts each episode on its day in Rome, midnight starting the next week", () => {
    expect(ids("Europe/Rome")).toEqual([
      ["2026-11-23", ["monday-tokyo-night"]],
      ["2026-11-24", []],
      ["2026-11-25", []],
      ["2026-11-26", []],
      ["2026-11-27", []],
      ["2026-11-28", []],
      ["2026-11-29", ["sunday-late"]],
    ]);
  });

  it("moves an episode to the next day in Tokyo", () => {
    expect(ids("Asia/Tokyo").map(([date, list]) => [date, list])).toEqual([
      ["2026-11-23", ["before"]],
      ["2026-11-24", ["monday-tokyo-night"]],
      ["2026-11-25", []],
      ["2026-11-26", []],
      ["2026-11-27", []],
      ["2026-11-28", []],
      ["2026-11-29", []],
    ]);
  });

  it("keeps the week whole at the far ends of the clock", () => {
    // Kiritimati is UTC+14, Pago Pago UTC−11: the window covers both.
    const kiritimati = groupByDay([{ airingAt: weekWindow(monday).from + 60 }], monday, "Pacific/Kiritimati");
    expect(kiritimati[0].episodes).toHaveLength(1);
    const pagoPago = groupByDay([{ airingAt: weekWindow(monday).to - 3600 * 2 }], monday, "Pacific/Pago_Pago");
    expect(pagoPago[6].episodes).toHaveLength(1);
  });

  it("is not thrown by the end of daylight saving in Rome (25 October 2026)", () => {
    const week = groupByDay(
      [
        { airingAt: at("2026-10-25T00:30:00Z") }, // 02:30 CEST… then the clock goes back
        { airingAt: at("2026-10-25T22:30:00Z") }, // 23:30 CET, still Sunday
        { airingAt: at("2026-10-25T23:00:00Z") }, // 00:00 Monday 26
      ],
      "2026-10-19",
      "Europe/Rome",
    );
    expect(week[6]).toMatchObject({ date: "2026-10-25" });
    expect(week[6].episodes).toHaveLength(2);
  });

  it("sorts each day by airing time", () => {
    const day = groupByDay([{ airingAt: at("2026-11-23T20:00:00Z") }, { airingAt: at("2026-11-23T10:00:00Z") }], monday, "UTC")[0];
    expect(day.episodes.map((e) => e.airingAt)).toEqual([at("2026-11-23T10:00:00Z"), at("2026-11-23T20:00:00Z")]);
  });
});

describe("labels", () => {
  it("names the day tabs and the chosen day", () => {
    expect(tabLabel("2026-11-23")).toEqual({ weekday: "lun", day: 23 });
    expect(tabLabel("2026-12-06")).toEqual({ weekday: "dom", day: 6 });
    expect(fullDayLabel("2026-11-24")).toBe("martedì 24 novembre");
  });

  it.each([
    ["2026-11-23", "23–29 novembre"],
    ["2026-11-30", "30 novembre – 6 dicembre"],
    ["2026-12-28", "28 dicembre 2026 – 3 gennaio 2027"],
  ])("%s → %s", (monday, text) => {
    expect(weekRangeLabel(monday)).toBe(text);
  });
});
