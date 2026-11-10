import { describe, expect, it } from "vitest";
import { envExampleNames, missingFromReference, secretLookalikes } from "./env-reference";

describe("env reference", () => {
  it("finds the variables missing from the table rows", () => {
    const doc = "Texto con `FUERA_DE_TABLA`.\n| `UNO` | web |\n| `DOS` | app |\n";
    expect(missingFromReference(doc, ["UNO", "DOS"])).toEqual([]);
    expect(missingFromReference(doc, ["UNO", "TRES", "FUERA_DE_TABLA"])).toEqual(["TRES", "FUERA_DE_TABLA"]);
  });

  it("reads the names of an .env.example, commented or not", () => {
    expect(envExampleNames("# comentario\nUNO=\n# DOS=valor\n  TRES=x\nno es variable\n")).toEqual(["UNO", "DOS", "TRES"]);
  });

  it("spots values that look like real keys but not the documented shapes", () => {
    expect(secretLookalikes("`eyJ…` (anon), `sk_test_…`, `sb_secret_…`, `whsec_…`")).toEqual([]);
    const real = `eyJ${"a".repeat(40)} sk_live_abc sk_test_${"b".repeat(24)} sb_secret_abc`;
    expect(secretLookalikes(real)).toHaveLength(4);
  });
});
