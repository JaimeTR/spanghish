import { describe, expect, it } from "vitest";
import { getShopProducts, parseProducts, rowToProduct } from "./shop-source";
import { PRODUCTS } from "./shop";

const env = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_x" };

const row = {
  slug: "alphabet",
  name_es: "El Abecedario",
  name_en: "The Alphabet",
  summary_es: "Material descargable",
  summary_en: null,
  price_cents: 200,
  compare_at_cents: 500,
  cover_path: null,
  cover_width: null,
  cover_height: null,
  has_file: true,
};

describe("rowToProduct", () => {
  it("convierte una fila y usa la imagen fija si no hay portada propia", () => {
    const p = rowToProduct(row, env)!;
    expect(p).toMatchObject({ id: "alphabet", priceCents: 200, compareAtCents: 500 });
    expect(p.image?.src).toBe("/img/shop/alphabet.webp");
    expect(p.summary).toEqual({ es: "Material descargable", en: "Material descargable" });
  });

  it("usa la portada subida cuando existe", () => {
    const p = rowToProduct({ ...row, slug: "nuevo-libro", cover_path: "products/abc.webp", cover_width: 800, cover_height: 600 }, env)!;
    expect(p.image).toEqual({ src: "https://x.supabase.co/storage/v1/object/public/content-media/products/abc.webp", width: 800, height: 600 });
  });

  it("descarta filas inválidas: precio bajo el mínimo de Stripe, identificador raro o sin nombre", () => {
    expect(rowToProduct({ ...row, price_cents: 20 }, env)).toBeNull();
    expect(rowToProduct({ ...row, slug: "Mal Id" }, env)).toBeNull();
    expect(rowToProduct({ ...row, name_en: "" }, env)).toBeNull();
    expect(parseProducts([row, null, { nada: 1 }], env)).toHaveLength(1);
  });

  it("ignora un precio tachado que no sea mayor", () => {
    expect(rowToProduct({ ...row, compare_at_cents: 100 }, env)).not.toHaveProperty("compareAtCents");
  });
});

describe("getShopProducts", () => {
  it("sin plataforma o si falla, usa la lista fija", async () => {
    expect(await getShopProducts({})).toBe(PRODUCTS);
    const failing = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    expect(await getShopProducts(env, failing)).toBe(PRODUCTS);
  });

  it("con datos, usa los de la base; con lista vacía, la tienda queda vacía a propósito", async () => {
    const ok = (async () => Response.json([row])) as unknown as typeof fetch;
    expect((await getShopProducts(env, ok)).map((p) => p.id)).toEqual(["alphabet"]);
    const empty = (async () => Response.json([])) as unknown as typeof fetch;
    expect(await getShopProducts(env, empty)).toEqual([]);
  });
});
