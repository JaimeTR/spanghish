import { describe, expect, it } from "vitest";
import { CART_STORAGE_KEY, cartReducer, EMPTY_CART, loadCart, parseStoredCart, saveCart, serializeCart } from "./cart";
import { MAX_ITEMS, PRODUCTS, subtotalCents } from "./shop";

const [a, b, c] = PRODUCTS.map((p) => p.id);

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("cart reducer", () => {
  it("adds known products once (digital goods: quantity 1) and removes them", () => {
    let s = cartReducer(EMPTY_CART, { type: "add", id: a! });
    s = cartReducer(s, { type: "add", id: b! });
    expect(cartReducer(s, { type: "add", id: a! })).toBe(s);
    expect(s.ids).toEqual([a, b]);
    s = cartReducer(s, { type: "remove", id: a! });
    expect(s.ids).toEqual([b]);
    expect(cartReducer(s, { type: "remove", id: "nope" })).toBe(s);
    expect(cartReducer(s, { type: "clear" }).ids).toEqual([]);
  });

  it("ignores unknown ids and sanitises replacements", () => {
    expect(cartReducer(EMPTY_CART, { type: "add", id: "fake" })).toBe(EMPTY_CART);
    expect(cartReducer(EMPTY_CART, { type: "replace", ids: [c!, "fake", c!, a!] }).ids).toEqual([c, a]);
  });

  it("subtotal comes from the server-side catalogue", () => {
    expect(subtotalCents([a!, b!, c!])).toBe(200 + 200 + 199);
    expect(subtotalCents([])).toBe(0);
    expect(MAX_ITEMS).toBeGreaterThanOrEqual(PRODUCTS.length);
  });
});

describe("cart persistence", () => {
  it("round-trips through storage and clears the key when empty", () => {
    const storage = memoryStorage();
    expect(saveCart(storage, { ids: [a!, c!] })).toBe(true);
    expect(storage.data.get(CART_STORAGE_KEY)).toBe(serializeCart({ ids: [a!, c!] }));
    expect(loadCart(storage).ids).toEqual([a, c]);
    saveCart(storage, EMPTY_CART);
    expect(storage.data.has(CART_STORAGE_KEY)).toBe(false);
  });

  it("broken, foreign or tampered data gives a clean cart", () => {
    expect(parseStoredCart(null)).toEqual(EMPTY_CART);
    expect(parseStoredCart("{not json")).toEqual(EMPTY_CART);
    expect(parseStoredCart('{"ids":"x"}')).toEqual(EMPTY_CART);
    expect(parseStoredCart(JSON.stringify({ ids: [a, a, "x", 42], priceCents: 1 })).ids).toEqual([a]);
  });

  it("works without storage or when storage throws (private mode)", () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(loadCart(undefined)).toEqual(EMPTY_CART);
    expect(loadCart(throwing)).toEqual(EMPTY_CART);
    expect(saveCart(undefined, { ids: [a!] })).toBe(false);
    expect(saveCart(throwing, { ids: [a!] })).toBe(false);
  });
});
