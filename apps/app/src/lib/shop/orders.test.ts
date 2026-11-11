import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { isAuthorized, orderSchema } = await import("./orders");

const SECRET = "s".repeat(40);

describe("isAuthorized", () => {
  it("acepta solo el secreto exacto en Bearer", () => {
    expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorized(SECRET, SECRET)).toBe(false);
    expect(isAuthorized(null, SECRET)).toBe(false);
  });

  it("un secreto corto o ausente no autoriza a nadie", () => {
    expect(isAuthorized("Bearer corto", "corto")).toBe(false);
    expect(isAuthorized(`Bearer ${SECRET}`, undefined)).toBe(false);
  });
});

describe("orderSchema", () => {
  const ok = { sessionId: "cs_test_a1b2c3d4e5f6", email: "ana@example.com", locale: "en", totalCents: 400, currency: "aud", items: [{ id: "alphabet", amountCents: 200 }] };

  it("acepta un pedido válido y aplica valores por defecto", () => {
    expect(orderSchema.parse(ok)).toMatchObject({ locale: "en", items: [{ id: "alphabet" }] });
    expect(orderSchema.parse({ ...ok, email: undefined, locale: undefined }).locale).toBe("es");
  });

  it("rechaza pedidos sin productos, con identificadores raros o importes negativos", () => {
    expect(orderSchema.safeParse({ ...ok, items: [] }).success).toBe(false);
    expect(orderSchema.safeParse({ ...ok, items: [{ id: "../x", amountCents: 1 }] }).success).toBe(false);
    expect(orderSchema.safeParse({ ...ok, totalCents: -1 }).success).toBe(false);
  });
});
