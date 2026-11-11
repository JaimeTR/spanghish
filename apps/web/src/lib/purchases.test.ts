import { describe, expect, it } from "vitest";
import { parsePurchases } from "./purchases";

describe("parsePurchases", () => {
  it("maps orders and items", () => {
    const out = parsePurchases([
      { order_id: "o1", created_at: "2026-01-01T00:00:00Z", total_cents: 1500, currency: "aud", items: [{ item_id: "i1", slug: "a", name: "Guía", amount_cents: 1500, file_path: "x.pdf", file_name: "x.pdf" }, { item_id: "i2", name: "Sin archivo", file_path: null }] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.items[0]).toMatchObject({ id: "i1", hasFile: true, fileName: "x.pdf" });
    expect(out[0]?.items[1]).toMatchObject({ hasFile: false, fileName: null });
  });
  it("ignores malformed data", () => {
    expect(parsePurchases(null)).toEqual([]);
    expect(parsePurchases([1, {}, { order_id: "o" }])).toEqual([]);
  });
});
