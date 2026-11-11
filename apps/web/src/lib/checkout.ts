import Stripe from "stripe";
import type { Locale } from "../i18n/routing";
import { findProduct, MAX_ITEMS, PRODUCTS, type Product } from "./shop";
import { getShopProducts } from "./shop-source";
import { SITE_URL } from "./site";

/**
 * Pago de los materiales con Stripe Checkout (página alojada por Stripe: los
 * datos de la tarjeta nunca pasan por este servidor). Solo servidor: lo usan la
 * acción de /shop y la página de éxito (la clave no lleva NEXT_PUBLIC_).
 *
 * - Las líneas del pago se reconstruyen en el servidor a partir de los ids y de
 *   lib/shop.ts: el navegador solo envía ids, nunca precios.
 * - Sin impuestos automáticos: si los precios llevan GST o no está pendiente de
 *   confirmar con la propietaria (ver README, "Tienda y pagos").
 * - Sin STRIPE_SECRET_KEY o si Stripe falla: "unavailable"/"failed". La interfaz
 *   lo dice y ofrece el email y el teléfono; nunca se finge un pago.
 */
export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: true; clientSecret: string }
  | { ok: false; reason: "invalid" | "unavailable" | "failed" };

/** Lo único que se usa del cliente de Stripe (se inyecta para poder probarlo). */
export type CheckoutClient = {
  checkout: {
    sessions: {
      create(params: Stripe.Checkout.SessionCreateParams): Promise<{ url: string | null; client_secret?: string | null }>;
    };
  };
};

type Env = Partial<Record<string, string | undefined>>;

/** Cliente de Stripe solo si hay clave; sin clave, null (pagos no activos). */
export function stripeFromEnv(env: Env = process.env): Stripe | null {
  const key = env.STRIPE_SECRET_KEY?.trim();
  return key ? new Stripe(key, { maxNetworkRetries: 1, timeout: 15_000 }) : null;
}

/** Valida los ids: conocidos, sin repetir y entre 1 y MAX_ITEMS. */
export function validateProductIds(ids: unknown, products: readonly Product[] = PRODUCTS): string[] | null {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_ITEMS) return null;
  if (!ids.every((id) => typeof id === "string" && findProduct(id, products))) return null;
  if (new Set(ids).size !== ids.length) return null;
  return ids as string[];
}

/** Parámetros de la sesión, solo con datos del servidor. */
export function checkoutParams(
  ids: readonly string[],
  locale: Locale,
  siteUrl: string = SITE_URL,
  products: readonly Product[] = PRODUCTS,
  embedded = false,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    currency: "aud",
    locale,
    line_items: ids.map((id) => {
      const product = findProduct(id, products)!;
      return {
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: product.priceCents,
          product_data: { name: product.name[locale], metadata: { productId: product.id } },
        },
      };
    }),
    // Stripe pide el email en la página de pago y crea el cliente; con él,
    // Maribel envía los archivos (entrega manual, fase 1).
    customer_creation: "always",
    metadata: { productIds: ids.join(","), locale },
    // {CHECKOUT_SESSION_ID} lo rellena Stripe: la página de éxito comprueba el pago con él.
    ...(embedded
      ? {
          // Pago dentro de la web (modal del carrito): no hay redirección salvo que el método de pago la exija.
          ui_mode: "embedded_page" as const,
          redirect_on_completion: "if_required" as const,
          return_url: `${siteUrl}/${locale}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
        }
      : {
          success_url: `${siteUrl}/${locale}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${siteUrl}/${locale}/shop`,
        }),
  };
}

export type PaymentStatus = "paid" | "unpaid" | "unknown";

/** Cliente mínimo para consultar una sesión (página de éxito). */
export type SessionLookupClient = {
  checkout: { sessions: { retrieve(id: string): Promise<{ payment_status: string; status: string | null }> } };
};

const SESSION_ID = /^cs_(?:test|live)_[A-Za-z0-9]{10,200}$/;

/**
 * Estado real del pago de una sesión. La página de éxito solo dice "pago
 * recibido" si Stripe lo confirma; sin clave, con un id raro o si Stripe falla: "unknown".
 */
export async function paymentStatus(sessionId: unknown, client: SessionLookupClient | null = stripeFromEnv()): Promise<PaymentStatus> {
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId) || !client) return "unknown";
  try {
    const session = await client.checkout.sessions.retrieve(sessionId);
    return session.payment_status === "paid" ? "paid" : "unpaid";
  } catch (error) {
    console.error("[checkout] No se pudo consultar la sesión", error instanceof Error ? error.message : error);
    return "unknown";
  }
}

/** La sesión de Stripe si está PAGADA; null en cualquier otro caso (sin clave, id raro, impagada o error). */
export async function retrievePaidSession(
  sessionId: unknown,
  client: { checkout: { sessions: { retrieve(id: string, params?: Stripe.Checkout.SessionRetrieveParams): Promise<Stripe.Checkout.Session> } } } | null = stripeFromEnv(),
): Promise<Stripe.Checkout.Session | null> {
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId) || !client) return null;
  try {
    // Se expande el cargo para enlazar el recibo (boleta) que aloja Stripe.
    const session = await client.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
    return session.payment_status === "paid" ? session : null;
  } catch (error) {
    console.error("[checkout] No se pudo consultar la sesión", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function createCheckoutSession(
  productIds: unknown,
  locale: Locale,
  client: CheckoutClient | null = stripeFromEnv(),
  siteUrl: string = SITE_URL,
  products?: readonly Product[],
  /** true: pago dentro de la web (devuelve client_secret); false: página de pago de Stripe (devuelve url). */
  embedded = false,
): Promise<CheckoutResult> {
  // El precio y el nombre salen SIEMPRE de la lista del servidor (base de datos o respaldo fijo), nunca del navegador.
  const catalogue = products ?? (await getShopProducts());
  const ids = validateProductIds(productIds, catalogue);
  if (!ids) return { ok: false, reason: "invalid" };
  if (!client) {
    console.error("[checkout] Falta STRIPE_SECRET_KEY: pagos no activos");
    return { ok: false, reason: "unavailable" };
  }
  try {
    const session = await client.checkout.sessions.create(checkoutParams(ids, locale, siteUrl, catalogue, embedded));
    if (embedded) {
      return session.client_secret ? { ok: true, clientSecret: session.client_secret } : { ok: false, reason: "failed" };
    }
    if (!session.url) return { ok: false, reason: "failed" };
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[checkout] Stripe no pudo crear la sesión", error instanceof Error ? error.message : error);
    return { ok: false, reason: "failed" };
  }
}

/** Recibo (boleta) alojado por Stripe del pago de la sesión; null si no hay o no es https. */
export function receiptUrlOf(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent || typeof intent !== "object") return null;
  const charge = intent.latest_charge;
  if (!charge || typeof charge !== "object") return null;
  const url = charge.receipt_url;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}
