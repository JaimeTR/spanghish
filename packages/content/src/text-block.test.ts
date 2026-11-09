import { describe, expect, it } from "vitest";
import { parseTextBlock } from "./text-block";

const plain = (text: string) => ({ text, bold: false });

describe("parseTextBlock", () => {
  it("parseTextBlock splits paragraphs on blank lines", () => {
    expect(parseTextBlock("Hola.\nSigue el párrafo.\n\n\nOtro párrafo.")).toEqual([
      { type: "p", parts: [plain("Hola.\nSigue el párrafo.")] },
      { type: "p", parts: [plain("Otro párrafo.")] },
    ]);
    expect(parseTextBlock("   \n\n  ")).toEqual([]);
    expect(parseTextBlock("a\r\n\r\nb")).toEqual([
      { type: "p", parts: [plain("a")] },
      { type: "p", parts: [plain("b")] },
    ]);
  });

  it("parseTextBlock groups '- ' lines into one list", () => {
    expect(parseTextBlock("Colores:\n- rojo\n- azul\n\nFin")).toEqual([
      { type: "p", parts: [plain("Colores:")] },
      { type: "ul", items: [[plain("rojo")], [plain("azul")]] },
      { type: "p", parts: [plain("Fin")] },
    ]);
    expect(parseTextBlock("- uno\n- dos\ntexto")).toEqual([
      { type: "ul", items: [[plain("uno")], [plain("dos")]] },
      { type: "p", parts: [plain("texto")] },
    ]);
  });

  it("parseTextBlock marks **bold** and leaves unmatched ** literal", () => {
    expect(parseTextBlock("El **sustantivo** es clave")).toEqual([
      {
        type: "p",
        parts: [plain("El "), { text: "sustantivo", bold: true }, plain(" es clave")],
      },
    ]);
    expect(parseTextBlock("2 ** 3 y **abierto")).toEqual([{ type: "p", parts: [plain("2 ** 3 y **abierto")] }]);
    expect(parseTextBlock("- **rojo**: red")).toEqual([
      { type: "ul", items: [[{ text: "rojo", bold: true }, plain(": red")]] },
    ]);
  });

  it("parseTextBlock keeps '<script>alert(1)</script>' and '[x](javascript:alert(1))' as literal text", () => {
    expect(parseTextBlock("<script>alert(1)</script>")).toEqual([
      { type: "p", parts: [plain("<script>alert(1)</script>")] },
    ]);
    expect(parseTextBlock("[x](javascript:alert(1)) <img src=x onerror=alert(1)>")).toEqual([
      { type: "p", parts: [plain("[x](javascript:alert(1)) <img src=x onerror=alert(1)>")] },
    ]);
  });
});
