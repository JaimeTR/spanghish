import { describe, expect, it } from "vitest";
import { resolvePrices, type PriceRow } from "./pricing";

const PROGRAM = "p0000000-0000-4000-8000-000000000001";
const OTHER_PROGRAM = "p0000000-0000-4000-8000-000000000002";
const EDITION = "e0000000-0000-4000-8000-000000000001";
const LIBRARY = "l0000000-0000-4000-8000-000000000001";
const OFFICE = "l0000000-0000-4000-8000-000000000002";

let n = 0;
function price(p: Partial<PriceRow>): PriceRow {
  n += 1;
  return {
    id: `price-${n}`,
    program_id: PROGRAM,
    edition_id: null,
    location_id: null,
    kind: "per_lesson",
    amount_cents: 1000,
    currency: "AUD",
    lessons_included: null,
    label_es: null,
    label_en: null,
    active: true,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...p,
  };
}

const ids = (rows: PriceRow[]) => rows.map((r) => r.id);

describe("resolvePrices", () => {
  it("edition+location price beats edition price", () => {
    const program = price({ amount_cents: 3000 });
    const edition = price({ edition_id: EDITION, amount_cents: 2800 });
    const location = price({ location_id: LIBRARY, amount_cents: 2900 });
    const both = price({ edition_id: EDITION, location_id: LIBRARY, amount_cents: 2500 });
    const all = [program, edition, location, both];

    expect(ids(resolvePrices(all, { programId: PROGRAM, editionId: EDITION, locationId: LIBRARY }))).toEqual([both.id]);
    expect(ids(resolvePrices(all, { programId: PROGRAM, editionId: EDITION, locationId: null }))).toEqual([edition.id]);
    expect(ids(resolvePrices(all, { programId: PROGRAM, editionId: null, locationId: LIBRARY }))).toEqual([location.id]);
    expect(ids(resolvePrices(all, { programId: PROGRAM, editionId: null, locationId: null }))).toEqual([program.id]);
  });

  it("an edition price beats a location price", () => {
    const edition = price({ edition_id: EDITION });
    const location = price({ location_id: LIBRARY });
    expect(ids(resolvePrices([location, edition], { programId: PROGRAM, editionId: EDITION, locationId: LIBRARY }))).toEqual([
      edition.id,
    ]);
  });

  it("a location price never applies to another location", () => {
    const program = price({});
    const library = price({ location_id: LIBRARY, amount_cents: 1 });
    expect(ids(resolvePrices([program, library], { programId: PROGRAM, editionId: null, locationId: OFFICE }))).toEqual([
      program.id,
    ]);
    expect(resolvePrices([library], { programId: PROGRAM, editionId: null, locationId: null })).toEqual([]);
  });

  it("an edition price never applies to another edition or program", () => {
    const edition = price({ edition_id: EDITION });
    const other = price({ program_id: OTHER_PROGRAM });
    expect(resolvePrices([edition, other], { programId: PROGRAM, editionId: null, locationId: null })).toEqual([]);
  });

  it("inactive prices are ignored", () => {
    const program = price({ amount_cents: 3000 });
    const inactive = price({ edition_id: EDITION, amount_cents: 100, active: false });
    expect(ids(resolvePrices([program, inactive], { programId: PROGRAM, editionId: EDITION, locationId: null }))).toEqual([
      program.id,
    ]);
  });

  it("returns one price per kind and lessons_included", () => {
    const perLesson = price({ kind: "per_lesson" });
    const perLessonEdition = price({ kind: "per_lesson", edition_id: EDITION });
    const pack10 = price({ kind: "pack", lessons_included: 10 });
    const pack5 = price({ kind: "pack", lessons_included: 5 });
    const pack10Library = price({ kind: "pack", lessons_included: 10, location_id: LIBRARY });
    const upfront = price({ kind: "upfront" });
    const result = resolvePrices([perLesson, perLessonEdition, pack10, pack5, pack10Library, upfront], {
      programId: PROGRAM,
      editionId: EDITION,
      locationId: LIBRARY,
    });
    expect(ids(result)).toEqual([perLessonEdition.id, upfront.id, pack5.id, pack10Library.id]);
  });
});
