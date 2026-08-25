import { describe, expect, it } from "vitest";
import {
  compareMonthKeys,
  formatMonthLabel,
  monthBoundsUtc,
  monthKeyFromDate,
  parseMonthKey,
  resolveMonthKey,
  shiftMonthKey,
} from "./ledger";

describe("month keys", () => {
  it("parses and rejects invalid keys", () => {
    expect(parseMonthKey("2026-08")).toEqual({ year: 2026, month: 8 });
    expect(parseMonthKey("2026-00")).toBeNull();
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("bad")).toBeNull();
  });

  it("derives keys from IST dates", () => {
    expect(monthKeyFromDate(new Date("2026-07-31T20:00:00.000Z"))).toBe("2026-08");
    expect(monthKeyFromDate(new Date("2026-07-31T18:29:59.999Z"))).toBe("2026-07");
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("compares month keys chronologically", () => {
    expect(compareMonthKeys("2026-07", "2026-08")).toBeLessThan(0);
    expect(compareMonthKeys("2026-08", "2026-08")).toBe(0);
    expect(compareMonthKeys("2027-01", "2026-12")).toBeGreaterThan(0);
  });

  it("formats month labels", () => {
    expect(formatMonthLabel("2026-08")).toBe("August 2026");
  });

  it("resolves invalid params to current month shape", () => {
    expect(resolveMonthKey("2026-08")).toBe("2026-08");
    expect(resolveMonthKey("nope")).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("monthBoundsUtc", () => {
  it("returns IST midnight boundaries as UTC dates", () => {
    const { start, end } = monthBoundsUtc("2026-08");
    expect(start.toISOString()).toBe("2026-07-31T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-08-31T18:30:00.000Z");
  });

  it("includes late IST nights in the correct month", () => {
    const { start, end } = monthBoundsUtc("2026-08");
    const lateNight = new Date("2026-08-31T17:30:00.000Z");
    expect(lateNight >= start && lateNight < end).toBe(true);

    const nextMonth = new Date("2026-08-31T19:00:00.000Z");
    expect(nextMonth >= start && nextMonth < end).toBe(false);
  });
});
