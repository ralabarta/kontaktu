import { describe, expect, it } from "vitest";
import { parseContactDate } from "@/lib/dates/parse-contact-date";

describe("parseContactDate", () => {
  it("parses an ISO timestamp", () => {
    expect(parseContactDate("2026-07-15T10:30:00.000Z")?.toISOString()).toBe(
      "2026-07-15T10:30:00.000Z",
    );
  });

  it("parses DD/MM/YYYY as a local calendar date", () => {
    const result = parseContactDate("15/07/2026");

    expect(
      result && [result.getFullYear(), result.getMonth(), result.getDate()],
    ).toEqual([2026, 6, 15]);
  });

  it("parses DD/MM/YYYY HH:mm as a local date and time", () => {
    const result = parseContactDate("15/07/2026 14:30");

    expect(
      result && [
        result.getFullYear(),
        result.getMonth(),
        result.getDate(),
        result.getHours(),
        result.getMinutes(),
      ],
    ).toEqual([2026, 6, 15, 14, 30]);
  });

  it("parses epoch seconds", () => {
    expect(parseContactDate(0)?.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("returns null for an invalid date", () => {
    expect(parseContactDate("31/02/2026")).toBeNull();
  });
});
