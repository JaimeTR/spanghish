import { describe, expect, it } from "vitest";
import { BAG_MODEL, BAG_POINTS, MCQ, MCQ_POINTS, PLURAL_POINTS, PLURALS, SORT_POINTS, TOTAL_POINTS, SORT_WORDS, checkBagItem, checkPlural } from "./nouns-data";

describe("lesson answer helpers", () => {
  it("accepts answers without accents and requires the article", () => {
    expect(checkPlural("los lapices", "los lápices")).toBe("right");
    expect(checkPlural("lapices", "los lápices")).toBe("missingArticle");
    expect(checkPlural("", "los lápices")).toBe("empty");
  });
  it("checks bag item structure and plural agreement", () => {
    expect(checkBagItem("unos libro")).toEqual({ ok: false, reason: "pluralNoun", article: "unos" });
    expect(checkBagItem("un movil")).toEqual({ ok: true });
    expect(checkBagItem("movil")).toEqual({ ok: false, reason: "structure" });
  });
  it("keeps the published exercise scores and lengths", () => {
    expect(SORT_POINTS + PLURAL_POINTS + MCQ_POINTS + BAG_POINTS).toBe(TOTAL_POINTS);
    expect(SORT_WORDS).toHaveLength(10);
    expect(PLURALS).toHaveLength(8);
    expect(MCQ).toHaveLength(8);
    expect(BAG_MODEL).toHaveLength(6);
  });
});

describe("published scoring", () => {
  it("adds up to the 30 points of the live lesson and flags wrong answers", () => {
    expect(TOTAL_POINTS).toBe(30);
    expect(checkPlural("Los Libros!", "los libros")).toBe("right");
    expect(checkPlural("los libro", "los libros")).toBe("wrong");
    expect(checkBagItem("")).toEqual({ ok: false, reason: "empty" });
    expect(checkBagItem("unas gafas de sol")).toEqual({ ok: true });
  });
});
