import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, isLikelySpam, MIN_FILL_MS, STARTED_AT_FIELD, validateBooking } from "./booking";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const VALID = {
  name: "  Ana   López ",
  email: "Ana@Example.com",
  phone: "",
  audience: "kids",
  place: "sunshineCoast",
  times: "Martes por la tarde",
  language: "spanish",
  message: "",
  consent: "yes",
};

describe("validateBooking", () => {
  it("accepts a complete request and cleans it", () => {
    expect(validateBooking(form(VALID))).toEqual({
      ok: true,
      data: {
        name: "Ana López",
        email: "ana@example.com",
        phone: "",
        audience: "kids",
        place: "sunshineCoast",
        times: "Martes por la tarde",
        language: "spanish",
        message: "",
        consent: true,
      },
    });
  });

  it("reports every missing required field (phone and message are optional)", () => {
    const r = validateBooking(form({}));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual({
      name: "required",
      email: "required",
      audience: "required",
      place: "required",
      times: "required",
      language: "required",
      consent: "consent",
    });
  });

  it("rejects a bad email, phone and options outside the list", () => {
    const r = validateBooking(
      form({ ...VALID, email: "ana@", phone: "call me", audience: "teens", place: "Perth", language: "french" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual({ email: "email", phone: "phone", audience: "choice", place: "choice", language: "choice" });
  });

  it("accepts Australian phone formats", () => {
    for (const phone of ["0413 178 583", "+61 413 178 583", "(07) 5555-1234"]) {
      expect(validateBooking(form({ ...VALID, phone })).ok, phone).toBe(true);
    }
  });

  it("enforces maximum lengths and strips control characters and line breaks from one-line fields", () => {
    const r = validateBooking(form({ ...VALID, message: "x".repeat(2001), times: "y".repeat(301) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ message: "tooLong", times: "tooLong" });

    const clean = validateBooking(form({ ...VALID, name: "Ana\u0000\nLópez\r\nBcc: x" }));
    expect(clean.ok && clean.data.name).toBe("Ana López Bcc: x");
  });

  it("requires the consent box to be ticked", () => {
    const r = validateBooking(form({ ...VALID, consent: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ consent: "consent" });
  });
});

describe("isLikelySpam", () => {
  const now = 1_700_000_000_000;
  const human = (elapsed: number, extra: Record<string, string> = {}) =>
    form({ [STARTED_AT_FIELD]: String(now - elapsed), ...extra });

  it("lets a person who took a few seconds through", () => {
    expect(isLikelySpam(human(MIN_FILL_MS + 1), now)).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(isLikelySpam(human(60_000, { [HONEYPOT_FIELD]: "http://spam.example" }), now)).toBe(true);
  });

  it("rejects submissions that are too fast, missing the timestamp or stale", () => {
    expect(isLikelySpam(human(500), now)).toBe(true);
    expect(isLikelySpam(form({}), now)).toBe(true);
    expect(isLikelySpam(form({ [STARTED_AT_FIELD]: "abc" }), now)).toBe(true);
    expect(isLikelySpam(human(2 * 24 * 60 * 60 * 1000), now)).toBe(true);
  });
});
