import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { ACCESS_LEVELS, cardsFor, RESOURCE_CARDS } from "./resources";
import { VIDEOS } from "./videos";

describe("resources", () => {
  it("every access level has cards and every card has copy in both locales", () => {
    for (const level of ACCESS_LEVELS) expect(cardsFor(level).length).toBeGreaterThan(0);
    for (const card of RESOURCE_CARDS) {
      const key = card.videoId ? "video" : card.key;
      for (const m of [es, en]) {
        const items = m.page.resources.access.items as Record<string, { title?: string; meta: string }>;
        expect(items[key]?.meta, `${key} meta`).toBeTruthy();
        if (!card.videoId) expect(items[key]?.title, `${key} title`).toBeTruthy();
      }
    }
  });

  it("only the open tier is usable today: the published videos and the current lessons", () => {
    const open = RESOURCE_CARDS.filter((c) => c.state === "open");
    expect(open.every((c) => c.access === "public")).toBe(true);
    expect(open.filter((c) => c.videoId).map((c) => c.videoId)).toEqual(VIDEOS.map((v) => v.id));
  });

  it("account resources are informational (self sign-up is closed) and student ones are behind the portal login", () => {
    expect(cardsFor("account").every((c) => c.state === "soon")).toBe(true);
    expect(cardsFor("enrolled").every((c) => c.state === "locked")).toBe(true);
    expect(RESOURCE_CARDS.filter((c) => c.state === "locked").every((c) => c.access !== "public")).toBe(true);
  });
});
