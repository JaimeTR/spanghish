import { describe, expect, it } from "vitest";
import { groupLessons } from "./content-groups";

describe("groupLessons", () => {
  it("preserves all five categories in order and sorts lessons by level and order", () => {
    const grouped = groupLessons([
      { id: "b", slug: "b", kind: "article", componentKey: null, category: "kids", levelCode: "A2", accessLevel: "public", locked: false, titleEs: "B", titleEn: "B", summaryEs: null, summaryEn: null, sortOrder: 2 },
      { id: "a", slug: "a", kind: "article", componentKey: null, category: "kids", levelCode: "A1", accessLevel: "public", locked: false, titleEs: "A", titleEn: "A", summaryEs: null, summaryEn: null, sortOrder: 1 },
    ]);
    expect(grouped.map((item) => item.category)).toEqual(["foundations", "kids", "adults", "stories", "games"]);
    expect(grouped[1].lessons.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
