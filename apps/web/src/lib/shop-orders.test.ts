import { describe, expect, it } from "vitest";
import type { OrderLead } from "./leads";
import { recordShopOrder } from "./shop-orders";

const order: OrderLead = {
  kind: "order",
  locale: "en",
  email: "ana@example.com",
  sessionId: "cs_test_a1b2c3d4e5f6",
  items: [{ id: "alphabet", name: "The Alphabet", amountCents: 200 }],
  totalCents: 200,
  currency: "aud",
};
const env = { WEB_REVALIDATE_SECRET: "s".repeat(40), NEXT_PUBLIC_APP_URL: "https://portal.example.com/" };

describe("recordShopOrder", () => {
  it("avisa al portal con el secreto y devuelve enlaces absolutos", async () => {
    let seen: { url: string; auth: string | null; body: unknown } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, auth: new Headers(init.headers).get("authorization"), body: JSON.parse(String(init.body)) };
      return Response.json({ downloads: [{ slug: "alphabet", name: "The Alphabet", hasFile: true, path: "/api/shop/download/tok/alphabet" }, { slug: "x", name: "X", hasFile: false, path: null }] });
    }) as unknown as typeof fetch;
    const result = await recordShopOrder(order, env, fetchImpl);
    expect(result).toEqual([{ slug: "alphabet", name: "The Alphabet", url: "https://portal.example.com/api/shop/download/tok/alphabet" }]);
    expect(seen!.url).toBe("https://portal.example.com/api/shop/orders");
    expect(seen!.auth).toBe(`Bearer ${"s".repeat(40)}`);
    expect(seen!.body).toMatchObject({ sessionId: "cs_test_a1b2c3d4e5f6", items: [{ id: "alphabet", amountCents: 200 }] });
  });

  it("devuelve null sin secreto, si el portal falla o responde basura", async () => {
    const fail = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    expect(await recordShopOrder(order, {}, fail)).toBeNull();
    expect(await recordShopOrder(order, env, fail)).toBeNull();
    const junk = (async () => Response.json({ otra: 1 })) as unknown as typeof fetch;
    expect(await recordShopOrder(order, env, junk)).toBeNull();
  });

  it("ignora rutas de descarga que no son del portal", async () => {
    const evil = (async () => Response.json({ downloads: [{ slug: "a", name: "A", path: "https://evil.example/x" }] })) as unknown as typeof fetch;
    expect(await recordShopOrder(order, env, evil)).toEqual([]);
  });
});
