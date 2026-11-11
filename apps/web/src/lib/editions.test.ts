import { describe, expect, it } from "vitest";
import { audFromCents, formatDay, parseEdition, parseEditions } from "./editions";

const row = {
  edition_id: "e1",
  program_code: "online-conversation-10w",
  program_name_es: "Conversación online (10 semanas)",
  program_name_en: "Online Conversation (10 weeks)",
  level_code: "B1",
  duration_weeks: 10,
  lesson_minutes: 50,
  starts_on: "2026-12-09",
  ends_on: "2027-02-17",
  schedule_es: "Miércoles, 19:00–19:50",
  schedule_en: "Wednesdays, 7:00–7:50pm",
  enrol_url: "http://insecure.example",
  location: { name: "Online", kind: "online", region: "online", address: null, map_url: null },
  prices: [
    { kind: "per_lesson", amount_cents: 2500, lessons_included: null },
    { kind: "upfront", amount_cents: 24500, lessons_included: 10 },
  ],
};

describe("parseEdition", () => {
  it("lee una fila completa y descarta enlaces que no son https", () => {
    const e = parseEdition(row)!;
    expect(e).toMatchObject({ id: "e1", levelCode: "B1", lessonMinutes: 50, upfrontCents: 24500, perLessonCents: 2500, enrolUrl: null });
    expect(e.location).toMatchObject({ name: "Online", address: null });
  });

  it("descarta filas incompletas o con fechas inválidas", () => {
    expect(parseEdition({ ...row, starts_on: "9/12/2026" })).toBeNull();
    expect(parseEdition({ ...row, program_name_es: "" })).toBeNull();
    expect(parseEdition(null)).toBeNull();
    expect(parseEditions("nada")).toEqual([]);
    expect(parseEditions([row, { nada: 1 }])).toHaveLength(1);
  });

  it("sin precios deja los importes vacíos", () => {
    expect(parseEdition({ ...row, prices: [] })).toMatchObject({ upfrontCents: null, perLessonCents: null });
  });
});

describe("formatos", () => {
  it("importes y fechas", () => {
    expect(audFromCents(24500)).toBe("$245");
    expect(audFromCents(2550)).toBe("$25.50");
    expect(formatDay("2026-12-09", "en")).toMatch(/9 Dec 2026/);
    expect(formatDay("2026-12-09", "es")).toMatch(/9 dic\.? 2026/);
  });
});
