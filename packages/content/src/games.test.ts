import { describe, expect, it } from "vitest";
import { gameToSource, parseGameSource } from "./games";

describe("parseGameSource", () => {
  it("parejas: exige entre 2 y 8", () => {
    expect(parseGameSource("match", "casa = house\nperro = dog")).toMatchObject({ ok: true });
    expect(parseGameSource("match", "casa = house")).toEqual({ ok: false, error: "count" });
    expect(parseGameSource("match", "casa house")).toMatchObject({ ok: false, error: "format", line: 1 });
  });

  it("completar: la respuesta va entre las opciones y el hueco es ___", () => {
    const r = parseGameSource("fill", "Yo ___ estudiante. | soy | eres, es");
    expect(r).toEqual({
      ok: true,
      data: { gameType: "fill", items: [{ text: "Yo ___ estudiante.", answer: "soy", options: ["soy", "eres", "es"] }] },
    });
    expect(parseGameSource("fill", "Yo soy estudiante. | soy | eres")).toMatchObject({ ok: false });
    expect(parseGameSource("fill", "Yo ___ estudiante. | soy")).toMatchObject({ ok: false, error: "format" });
  });

  it("ordenar: al menos dos palabras y traducción opcional", () => {
    expect(parseGameSource("order", "Yo soy estudiante | I am a student")).toMatchObject({ ok: true });
    expect(parseGameSource("order", "Hola")).toMatchObject({ ok: false });
  });

  it("verdadero/falso: acepta v/f y explicación", () => {
    const r = parseGameSource("truefalse", "El sol es frío. | falso | Es muy caliente.\nEl agua moja. | v");
    expect(r).toMatchObject({ ok: true });
    if (r.ok && r.data.gameType === "truefalse") expect(r.data.items.map((i) => i.answer)).toEqual([false, true]);
    expect(parseGameSource("truefalse", "Algo | quizá")).toMatchObject({ ok: false, error: "format" });
  });

  it("vacío", () => {
    expect(parseGameSource("flashcards", "  \n ")).toEqual({ ok: false, error: "empty" });
  });

  it("gameToSource es la inversa", () => {
    for (const [type, src] of [
      ["match", "casa = house\nperro = dog"],
      ["fill", "Yo ___ estudiante. | soy | eres, es"],
      ["order", "Yo soy estudiante | I am a student"],
      ["flashcards", "hola = hello"],
      ["truefalse", "El agua moja. | v | Siempre"],
    ] as const) {
      const r = parseGameSource(type, src);
      expect(r.ok).toBe(true);
      if (r.ok) expect(gameToSource(r.data)).toBe(src);
    }
  });
});
