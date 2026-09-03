import { describe, expect, it } from "vitest";
import {
  formatContactDate,
  formatContactDateTime,
  formatContactListDate,
} from "@/lib/dates/format-contact-date";

const MADRID_DAY_BOUNDARY = "2026-07-08T22:30:00Z";

describe("contact date formatting", () => {
  it("uses the Madrid calendar day for date and datetime presentations", () => {
    expect(formatContactDate(MADRID_DAY_BOUNDARY)).toBe("9 jul 2026");
    expect(formatContactDateTime(MADRID_DAY_BOUNDARY)).toBe("9 jul, 00:30");
    expect(formatContactListDate(MADRID_DAY_BOUNDARY)).toBe("09 jul");
  });

  it("preserves pending labels for null and invalid values", () => {
    expect(formatContactDate(null)).toBe("fecha pendiente");
    expect(formatContactDate("invalid-date")).toBe("fecha pendiente");
    expect(formatContactDateTime(null)).toBe("Fecha pendiente");
    expect(formatContactDateTime("invalid-date")).toBe("Fecha pendiente");
    expect(formatContactListDate(null)).toBe("Fecha pendiente");
    expect(formatContactListDate("invalid-date")).toBe("Fecha pendiente");
  });
});
