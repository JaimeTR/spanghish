import { describe, expect, it } from "vitest";
import { parseForm } from "../forms";
import { editionSchema, locationSchema, priceSchema, programSchema } from "./catalog";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const PROGRAM = {
  code: "adults-a1",
  nameEs: "Adultos A1",
  nameEn: "Adults A1",
  languageCode: "es",
  audience: "adults",
  format: "local_group",
  lessonMinutes: "70",
};

describe("locationSchema", () => {
  it("locationSchema rejects an address for a home location", () => {
    const r = parseForm(locationSchema, form({ name: "Casa", kind: "home", region: "brisbane", address: "1 Calle" }));
    expect(r).toEqual({ ok: false, fieldErrors: { address: "invalid" } });
  });

  it("accepts a library with address and https map, and reads the active checkbox", () => {
    const r = parseForm(
      locationSchema,
      form({
        name: " Biblioteca ",
        kind: "library",
        region: "sunshine_coast",
        address: "1 Calle",
        mapUrl: "https://maps.example.com/x",
        active: "on",
      }),
    );
    expect(r).toEqual({
      ok: true,
      data: {
        name: "Biblioteca",
        kind: "library",
        region: "sunshine_coast",
        address: "1 Calle",
        mapUrl: "https://maps.example.com/x",
        active: true,
      },
    });
  });

  it("rejects a map link that is not https", () => {
    const r = parseForm(locationSchema, form({ name: "B", kind: "office", region: "brisbane", mapUrl: "http://x.y" }));
    expect(r).toEqual({ ok: false, fieldErrors: { mapUrl: "url" } });
  });
});

describe("programSchema", () => {
  it("programSchema rejects code 'Adults A1'", () => {
    const r = parseForm(programSchema, form({ ...PROGRAM, code: "Adults A1" }));
    expect(r).toEqual({ ok: false, fieldErrors: { code: "invalid" } });
  });

  it("programSchema requires both names", () => {
    const r = parseForm(programSchema, form({ ...PROGRAM, nameEn: "" }));
    expect(r).toEqual({ ok: false, fieldErrors: { nameEn: "required" } });
  });

  it("parses numbers and checkboxes", () => {
    const r = parseForm(programSchema, form({ ...PROGRAM, durationWeeks: "9", isPublic: "on" }));
    expect(r.ok && r.data).toMatchObject({ durationWeeks: 9, lessonMinutes: 70, isPublic: true, active: false });
  });

  it("rejects out-of-range numbers", () => {
    const r = parseForm(programSchema, form({ ...PROGRAM, durationWeeks: "60", lessonMinutes: "abc" }));
    expect(r).toEqual({ ok: false, fieldErrors: { durationWeeks: "range", lessonMinutes: "number" } });
  });
});

describe("editionSchema", () => {
  const base = { programId: "b0000000-0000-4000-8000-000000000101", status: "draft" };

  it("editionSchema rejects an end before the start", () => {
    const r = parseForm(editionSchema, form({ ...base, startsOn: "2027-03-01", endsOn: "2027-02-01" }));
    expect(r).toEqual({ ok: false, fieldErrors: { endsOn: "range" } });
  });

  it("accepts a one-day edition and rejects impossible dates", () => {
    expect(parseForm(editionSchema, form({ ...base, startsOn: "2027-03-01", endsOn: "2027-03-01" })).ok).toBe(true);
    const r = parseForm(editionSchema, form({ ...base, startsOn: "2027-02-30", endsOn: "2027-03-01" }));
    expect(r).toEqual({ ok: false, fieldErrors: { startsOn: "date" } });
  });
});

describe("priceSchema", () => {
  const base = { programId: "b0000000-0000-4000-8000-000000000101" };

  it("priceSchema rejects 'pack' without lessons", () => {
    const r = parseForm(priceSchema, form({ ...base, kind: "pack", amount: "245" }));
    expect(r).toEqual({ ok: false, fieldErrors: { lessonsIncluded: "required" } });
  });

  it("rejects lessons on a per-lesson price and malformed amounts", () => {
    const r = parseForm(priceSchema, form({ ...base, kind: "per_lesson", amount: "1.234", lessonsIncluded: "1" }));
    expect(r).toEqual({ ok: false, fieldErrors: { amount: "number" } });
    const r2 = parseForm(priceSchema, form({ ...base, kind: "per_lesson", amount: "25", lessonsIncluded: "1" }));
    expect(r2).toEqual({ ok: false, fieldErrors: { lessonsIncluded: "invalid" } });
  });

  it("parses the amount to cents (amount holds cents) and keeps optional scope ids", () => {
    const r = parseForm(
      priceSchema,
      form({
        ...base,
        editionId: "b0000000-0000-4000-8000-000000000201",
        kind: "pack",
        amount: "245.50",
        lessonsIncluded: "10",
      }),
    );
    expect(r).toEqual({
      ok: true,
      data: {
        ...base,
        editionId: "b0000000-0000-4000-8000-000000000201",
        kind: "pack",
        amount: 24550,
        lessonsIncluded: 10,
      },
    });
  });
});
