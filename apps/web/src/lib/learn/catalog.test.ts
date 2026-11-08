import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { ROUTE_KEYS } from "../routes";
import { LEARN_CATEGORIES, LESSONS, lessonNeighbours, LEVELS } from "./catalog";

describe("learn catalogue", () => {
  it("mirrors the live menu: foundations plus kids, adults, stories and games by level A1–C2", () => {
    expect(LEARN_CATEGORIES.map((c) => c.key)).toEqual(["foundations", "kids", "adults", "stories", "games"]);
    for (const c of LEARN_CATEGORIES.slice(1)) expect(c.items.map((i) => i.level)).toEqual([...LEVELS]);
  });

  it("only the two published lessons link anywhere; the rest is coming soon", () => {
    const linked = LEARN_CATEGORIES.flatMap((c) => c.items.filter((i) => i.lesson).map((i) => i.lesson));
    expect(new Set(linked)).toEqual(new Set(["learnAlphabet", "learnNouns"]));
    for (const l of LESSONS) expect(ROUTE_KEYS).toContain(l.route);
    expect(lessonNeighbours("learnAlphabet")).toEqual({ prev: undefined, next: LESSONS[1] });
    expect(lessonNeighbours("learnNouns")).toEqual({ prev: LESSONS[0], next: undefined });
  });

  it("every label has copy in both locales", () => {
    for (const m of [es, en]) {
      for (const c of LEARN_CATEGORIES) {
        expect(m.page.learn.categories[c.key].title).toBeTruthy();
        for (const i of c.items) if (i.label) expect(m.page.learn.items[i.label]).toBeTruthy();
      }
    }
  });
});
