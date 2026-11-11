import { APP_URL } from "./site";
import type { OrderLead } from "./leads";

/**
 * Pedidos pagados → portal. La web NO guarda pedidos ni tiene la clave de
 * servicio: avisa al portal (POST /api/shop/orders, con el secreto compartido
 * WEB_REVALIDATE_SECRET), que los registra y devuelve los enlaces de descarga
 * de los productos que tienen archivo. Si el portal no responde, nada se rompe:
 * se sigue avisando por correo y la entrega se hace a mano.
 */
export type OrderDownload = { slug: string; name: string; url: string };

type Env = Partial<Record<string, string | undefined>>;

function parseDownloads(data: unknown, base: string): OrderDownload[] | null {
  if (typeof data !== "object" || data === null) return null;
  const list = (data as { downloads?: unknown }).downloads;
  if (!Array.isArray(list)) return null;
  const out: OrderDownload[] = [];
  for (const row of list) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.slug === "string" && typeof r.name === "string" && typeof r.path === "string" && r.path.startsWith("/api/shop/download/")) {
      out.push({ slug: r.slug, name: r.name, url: `${base}${r.path}` });
    }
  }
  return out;
}

function config(env: Env): { base: string; secret: string } | null {
  const secret = env.WEB_REVALIDATE_SECRET;
  if (!secret || secret.length < 32) return null;
  const base = (env.NEXT_PUBLIC_APP_URL ?? APP_URL).replace(/\/$/, "");
  return { base, secret };
}

/** Avisa al portal de lo reembolsado de un pago. false si el portal no está configurado o falla. */
export async function recordShopRefund(
  paymentIntentId: string,
  refundedCents: number,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const cfg = config(env);
  if (!cfg) return false;
  try {
    const res = await fetchImpl(`${cfg.base}/api/shop/refunds`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId, refundedCents }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    // 404: no hay pedido de la tienda con ese pago (otro cobro de la misma cuenta de Stripe): no se reintenta.
    if (!res.ok && res.status !== 404) console.error(`[shop-orders] El portal respondió ${res.status} al reembolso`);
    return res.ok || res.status === 404;
  } catch (error) {
    console.error("[shop-orders] No se pudo avisar del reembolso", error instanceof Error ? error.message : error);
    return false;
  }
}

/** Registra el pedido en el portal. null si el portal no está configurado o falla. */
export async function recordShopOrder(
  order: OrderLead,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<OrderDownload[] | null> {
  const cfg = config(env);
  if (!cfg) return null;
  try {
    const res = await fetchImpl(`${cfg.base}/api/shop/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: order.sessionId,
        email: order.email,
        locale: order.locale,
        totalCents: order.totalCents,
        currency: order.currency,
        ...(order.paymentIntentId ? { paymentIntentId: order.paymentIntentId } : {}),
        items: order.items.map((i) => ({ id: i.id, amountCents: i.amountCents })),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[shop-orders] El portal respondió ${res.status}`);
      return null;
    }
    return parseDownloads(await res.json(), cfg.base);
  } catch (error) {
    console.error("[shop-orders] No se pudo avisar al portal", error instanceof Error ? error.message : error);
    return null;
  }
}
