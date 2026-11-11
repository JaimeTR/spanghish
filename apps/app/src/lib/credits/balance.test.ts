import { describe, expect, it } from "vitest";
import { availableLessons, isUsable } from "./balance";

const pack = (remaining: number, voided = false, expired = false) => ({ remaining, voided_at: voided ? "2026-11-01T00:00:00Z" : null, is_expired: expired });

describe("availableLessons", () => {
  it("suma solo los packs usables", () => {
    expect(availableLessons([pack(5), pack(3), pack(10, true), pack(4, false, true)])).toBe(8);
  });

  it("un saldo negativo no resta y sin packs es cero", () => {
    expect(availableLessons([pack(-2), pack(3)])).toBe(3);
    expect(availableLessons([])).toBe(0);
  });
});

describe("isUsable", () => {
  it("no se usan los anulados ni los caducados", () => {
    expect(isUsable(pack(1))).toBe(true);
    expect(isUsable(pack(1, true))).toBe(false);
    expect(isUsable(pack(1, false, true))).toBe(false);
  });
});
