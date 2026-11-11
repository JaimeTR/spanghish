import { getRpc, platformEnv } from "./platform";
import { PRODUCTS, STATIC_IMAGES, type Product } from "./shop";

/**
 * Productos a la venta. La fuente es la tabla `products` del portal, leída por
 * la RPC pública `list_shop_products` (solo publicados, sin la ruta del archivo).
 * Si la plataforma no está configurada o falla, se usa la lista fija de
 * lib/shop.ts: la tienda nunca queda vacía por un fallo de lectura. Si la
 * lectura sale bien pero no hay ningún producto publicado, la tienda está
 * vacía a propósito (alguien los despublicó).
 */
type Env = Partial<Record<string, string | undefined>>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);

function coverUrl(path: string, env: Env): string | null {
  const cfg = platformEnv(env);
  return cfg ? `${cfg.url}/storage/v1/object/public/content-media/${path}` : null;
}

/** Fila de la RPC → producto; null si le falta algo imprescindible. */
export function rowToProduct(row: unknown, env: Env = process.env): Product | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const id = text(r.slug);
  const nameEs = text(r.name_es);
  const nameEn = text(r.name_en);
  const price = int(r.price_cents);
  if (!id || !SLUG.test(id) || !nameEs || !nameEn || price === null || price < 50) return null;

  const compare = int(r.compare_at_cents);
  const coverPath = text(r.cover_path);
  const width = int(r.cover_width);
  const height = int(r.cover_height);
  const cover = coverPath && width && height ? coverUrl(coverPath, env) : null;
  const summaryEs = text(r.summary_es);
  const summaryEn = text(r.summary_en);

  return {
    id,
    name: { es: nameEs, en: nameEn },
    priceCents: price,
    ...(compare !== null && compare > price ? { compareAtCents: compare } : {}),
    image: cover && width && height ? { src: cover, width, height } : (STATIC_IMAGES[id] ?? null),
    summary: { es: summaryEs ?? summaryEn ?? "", en: summaryEn ?? summaryEs ?? "" },
    alt: { es: nameEs, en: nameEn },
    type: "digital-download",
  };
}

export function parseProducts(data: unknown, env: Env = process.env): Product[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => rowToProduct(row, env)).filter((p): p is Product => p !== null);
}

export async function getShopProducts(env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<readonly Product[]> {
  const result = await getRpc<unknown>("list_shop_products", {}, env, fetchImpl);
  if (!result.ok || !Array.isArray(result.data)) return PRODUCTS;
  return parseProducts(result.data, env);
}
