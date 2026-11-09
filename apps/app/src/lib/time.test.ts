import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDay,
  formatInstant,
  formatSessionTime,
  SCHOOL_TIME_ZONE,
  schoolDayRange,
  schoolToday,
  weekStart,
} from "./time";

describe("school time (Australia/Brisbane)", () => {
  it("uses Australia/Brisbane", () => {
    expect(SCHOOL_TIME_ZONE).toBe("Australia/Brisbane");
  });

  it("schoolToday at 2026-11-08T15:30Z is 2026-11-09", () => {
    expect(schoolToday(new Date("2026-11-08T15:30:00Z"))).toBe("2026-11-09");
  });

  it("schoolToday just before Brisbane midnight is still the same day", () => {
    expect(schoolToday(new Date("2026-11-08T13:59:59Z"))).toBe("2026-11-08");
  });

  it("schoolDayRange('2026-11-09') is 2026-11-08T14:00Z..2026-11-09T14:00Z", () => {
    expect(schoolDayRange("2026-11-09")).toEqual({
      from: "2026-11-08T14:00:00.000Z",
      to: "2026-11-09T14:00:00.000Z",
    });
  });

  it("a 07:00 Brisbane session falls inside its Brisbane day", () => {
    // 07:00 en Brisbane = 21:00 UTC del día anterior.
    const startsAt = new Date("2026-11-08T21:00:00Z").toISOString();
    const { from, to } = schoolDayRange("2026-11-09");
    expect(startsAt >= from && startsAt < to).toBe(true);
    const prev = schoolDayRange("2026-11-08");
    expect(startsAt >= prev.from && startsAt < prev.to).toBe(false);
  });

  it("July has the same offset as December (no DST)", () => {
    expect(schoolDayRange("2026-07-15").from).toBe("2026-07-14T14:00:00.000Z");
    expect(schoolDayRange("2026-12-15").from).toBe("2026-12-14T14:00:00.000Z");
  });

  it("weekStart of a Sunday is the previous Monday", () => {
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
  });

  it("weekStart of a Monday is the same day", () => {
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
  });

  it("addDays crosses months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("rejects malformed days", () => {
    expect(() => schoolDayRange("2026-13-01")).toThrow();
    expect(() => addDays("ayer", 1)).toThrow();
  });

  it("formatSessionTime shows Brisbane wall-clock time", () => {
    const text = formatSessionTime("2026-11-08T21:00:00Z", "2026-11-08T22:10:00Z", "es");
    expect(text).toMatch(/^0?7:00\s?–\s?0?8:10$/);
    const en = formatSessionTime("2026-11-09T08:00:00Z", "2026-11-09T09:10:00Z", "en");
    expect(en).toMatch(/0?6:00/);
    expect(en).toMatch(/0?7:10/);
    expect(en.toLowerCase()).toContain("pm");
  });

  it("formatDay shows the calendar day without shifting it", () => {
    expect(formatDay("2027-02-01", "en")).toMatch(/^1 Feb\.? 2027$/);
    expect(formatDay("2027-02-01", "es")).toMatch(/^1 feb\.? 2027$/);
    expect(formatDay("2026-12-31", "en")).toMatch(/31 Dec/);
  });

  it("formatInstant shows the Brisbane date and time of an instant", () => {
    // 2026-11-08T21:30Z = 9 Nov 07:30 in Brisbane.
    expect(formatInstant("2026-11-08T21:30:00Z", "en")).toMatch(/9 Nov\.? 2026.*07:30/);
  });
});
