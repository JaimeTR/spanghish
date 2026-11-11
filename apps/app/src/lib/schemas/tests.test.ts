import { describe, expect, it } from "vitest";
import { parseForm } from "../forms";
import { questionSchema, testSchema } from "./tests";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

const TEST_ID = "b0000000-0000-4000-8000-000000000001";

describe("testSchema", () => {
  it("acepta lo mínimo y deja opcionales los límites", () => {
    const r = parseForm(
      testSchema,
      form({ slug: "a1-ser-estar", titleEs: "Ser y estar", titleEn: "Ser and estar", accessLevel: "enrolled", visibility: "portal", passPercent: "60", gradeScale: "10" }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ inResources: false, shuffleQuestions: false, passPercent: 60 });
  });

  it("rechaza identificador inválido, aprobado fuera de rango y visibilidad desconocida", () => {
    const r = parseForm(
      testSchema,
      form({ slug: "Mal Id", titleEs: "x", titleEn: "x", accessLevel: "enrolled", visibility: "todos", passPercent: "150", gradeScale: "10" }),
    );
    expect(r).toMatchObject({ ok: false, fieldErrors: { slug: "invalid", visibility: "invalid", passPercent: "range" } });
  });
});

describe("questionSchema", () => {
  const base = { testId: TEST_ID, promptEs: "¿Cuál?", promptEn: "Which?" };

  it("opción única: 2–5 opciones y la correcta debe existir", () => {
    expect(parseForm(questionSchema, form({ ...base, kind: "single", options: "soy\neres", correctOption: "1" })).ok).toBe(true);
    expect(parseForm(questionSchema, form({ ...base, kind: "single", options: "soy", correctOption: "1" }))).toMatchObject({ ok: false, fieldErrors: { options: "invalid" } });
    expect(parseForm(questionSchema, form({ ...base, kind: "single", options: "soy\neres", correctOption: "3" }))).toMatchObject({ ok: false, fieldErrors: { correctOption: "range" } });
    expect(parseForm(questionSchema, form({ ...base, kind: "single", options: "soy\neres" }))).toMatchObject({ ok: false, fieldErrors: { correctOption: "required" } });
  });

  it("verdadero/falso y respuesta escrita", () => {
    expect(parseForm(questionSchema, form({ ...base, kind: "truefalse", correctBool: "false" })).ok).toBe(true);
    expect(parseForm(questionSchema, form({ ...base, kind: "truefalse" }))).toMatchObject({ ok: false, fieldErrors: { correctBool: "required" } });
    expect(parseForm(questionSchema, form({ ...base, kind: "fill", accepted: "soy\nSoy" })).ok).toBe(true);
    expect(parseForm(questionSchema, form({ ...base, kind: "fill" }))).toMatchObject({ ok: false, fieldErrors: { accepted: "required" } });
  });
});
