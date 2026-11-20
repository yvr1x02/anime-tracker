import { describe, expect, it } from "vitest";
import { dataFreshnessMessage } from "./data-freshness";

const HOUR = 3600;
const now = Date.parse("2026-11-20T16:00:00Z");

describe("dataFreshnessMessage", () => {
  it("says nothing while data is within its cache time", () => {
    expect(dataFreshnessMessage("Fri, 20 Nov 2026 15:30:00 GMT", HOUR, now, "Europe/Rome")).toBeNull();
    expect(dataFreshnessMessage("Fri, 20 Nov 2026 15:00:00 GMT", HOUR, now, "Europe/Rome")).toBeNull();
  });

  it("gives the time, in the given time zone, once data is older than its cache", () => {
    const fetchedAt = "Fri, 20 Nov 2026 14:16:00 GMT";
    expect(dataFreshnessMessage(fetchedAt, HOUR, now, "Europe/Rome")).toBe("Dati aggiornati alle 15:16.");
    expect(dataFreshnessMessage(fetchedAt, HOUR, now, "America/New_York")).toBe("Dati aggiornati alle 09:16.");
  });

  it("adds the date when data is from another day in that time zone", () => {
    const fetchedAt = "Tue, 17 Nov 2026 14:16:00 GMT";
    expect(dataFreshnessMessage(fetchedAt, HOUR, now, "Europe/Rome")).toBe("Dati aggiornati al 17 nov alle 15:16.");
    // Fetched at 22:00 on the 20th in Tokyo, where it is now 01:00 on the 21st; in Rome both are the 20th.
    const lateEvening = "Fri, 20 Nov 2026 13:00:00 GMT";
    expect(dataFreshnessMessage(lateEvening, HOUR, now, "Asia/Tokyo")).toBe("Dati aggiornati al 20 nov alle 22:00.");
    expect(dataFreshnessMessage(lateEvening, HOUR, now, "Europe/Rome")).toBe("Dati aggiornati alle 14:00.");
  });

  it.each([null, "", "not a date"])("says nothing when the time is unknown: %j", (fetchedAt) => {
    expect(dataFreshnessMessage(fetchedAt, HOUR, now, "Europe/Rome")).toBeNull();
  });

  it("says nothing when AniList's clock is ahead of the browser's", () => {
    expect(dataFreshnessMessage("Fri, 20 Nov 2026 17:00:00 GMT", HOUR, now, "Europe/Rome")).toBeNull();
  });
});
