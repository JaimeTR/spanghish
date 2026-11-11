import "server-only";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "../supabase/admin";

/**
 * Pedidos de la tienda y descargas. Lo llama la WEB (que no tiene la clave de
 * servicio) por las rutas /api/shop/*, protegidas con el secreto compartido
 * WEB_REVALIDATE_SECRET; aquí sí hay service_role. Solo se registra lo que la
 * web ya comprobó con Stripe. El comprador entra por un enlace con token largo
 * (/api/shop/download/<token>/<producto>) que caduca a los 30 días.
 */
export const MIN_SECRET = 32;

/** ¿Trae la petición el secreto compartido en `Authorization: Bearer`? Comparación en tiempo constante. */
export function isAuthorized(header: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_SECRET || !header) return false;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  const given = Buffer.from(match[1]!);
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const orderSchema = z.object({
  sessionId: z.string().min(10).max(255),
  email: z.string().trim().max(254).optional().default(""),
  locale: z.enum(["es", "en"]).default("es"),
  totalCents: z.number().int().min(0).max(10_000_000),
  currency: z.string().length(3).default("aud"),
  paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]{5,200}$/).optional(),
  items: z
    .array(z.object({ id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60), amountCents: z.number().int().min(0).max(10_000_000) }))
    .min(1)
    .max(20),
});
export type OrderInput = z.infer<typeof orderSchema>;

export type OrderDownload = { slug: string; name: string; hasFile: boolean; path: string | null };
export type OrderResult = { ok: true; downloads: OrderDownload[] } | { ok: false; status: 404 | 500 };

const SESSION = /^cs_(?:test|live)_[A-Za-z0-9]{10,200}$/;

type Admin = ReturnType<typeof createAdminClient>;

async function downloadsFor(admin: Admin, order: { id: string; token: string }): Promise<OrderDownload[] | null> {
  const items = await admin.from("shop_order_items").select("slug, name, product_id").eq("order_id", order.id);
  if (items.error) return null;
  const ids = items.data.map((i) => i.product_id).filter((v): v is string => Boolean(v));
  const files = new Set<string>();
  if (ids.length) {
    const products = await admin.from("products").select("id, file_path").in("id", ids);
    if (products.error) return null;
    for (const p of products.data) if (p.file_path) files.add(p.id);
  }
  return items.data.map((i) => ({
    slug: i.slug,
    name: i.name,
    hasFile: i.product_id !== null && files.has(i.product_id),
    path: i.product_id !== null && files.has(i.product_id) ? `/api/shop/download/${order.token}/${i.slug}` : null,
  }));
}

/**
 * Cuenta de la persona que compró: la existente con ese correo, o una nueva con el rol
 * `customer` (cliente de la tienda web: no es alumna y no entra al portal). Entra a la web
 * con un enlace que se envía a su correo, así que basta con que el correo sea suyo.
 */
export async function ensureCustomer(admin: Admin, email: string, locale: "es" | "en"): Promise<string | null> {
  const clean = email.trim().toLowerCase();
  if (!clean || clean.length > 254) return null;
  const found = await admin.from("profiles").select("id").eq("email", clean).maybeSingle();
  if (found.error) return null;
  if (found.data) return found.data.id;

  const created = await admin.auth.admin.createUser({
    email: clean,
    email_confirm: true,
    app_metadata: { initial_role: "customer" },
  });
  if (created.error || !created.data.user) {
    // Carrera: otro aviso del mismo pago la acaba de crear.
    const again = await admin.from("profiles").select("id").eq("email", clean).maybeSingle();
    return again.data?.id ?? null;
  }
  await admin.from("profiles").update({ preferred_locale: locale }).eq("id", created.data.user.id);
  return created.data.user.id;
}

/** Registra un pedido pagado (idempotente por sesión de Stripe) y devuelve los enlaces de descarga. */
export async function registerOrder(input: OrderInput, admin: Admin = createAdminClient()): Promise<OrderResult> {
  if (!SESSION.test(input.sessionId)) return { ok: false, status: 404 };

  const existing = await admin.from("shop_orders").select("id, token, user_id, payment_intent_id").eq("stripe_session_id", input.sessionId).maybeSingle();
  if (existing.error) return { ok: false, status: 500 };
  let order = existing.data;

  // Pedido anterior al módulo Pagos: se completa con el pago de Stripe.
  if (order && !order.payment_intent_id && input.paymentIntentId) {
    await admin.from("shop_orders").update({ payment_intent_id: input.paymentIntentId }).eq("id", order.id);
  }

  // Pedido ya registrado sin cuenta (p. ej. antes de existir esta función): se enlaza ahora.
  if (order && !order.user_id && input.email) {
    const userId = await ensureCustomer(admin, input.email, input.locale);
    if (userId) await admin.from("shop_orders").update({ user_id: userId }).eq("id", order.id);
  }

  if (!order) {
    const userId = input.email ? await ensureCustomer(admin, input.email, input.locale) : null;
    const slugs = input.items.map((i) => i.id);
    const products = await admin.from("products").select("id, slug, name_en, name_es").in("slug", slugs);
    if (products.error) return { ok: false, status: 500 };
    const bySlug = new Map(products.data.map((p) => [p.slug, p]));

    const created = await admin
      .from("shop_orders")
      .insert({
        stripe_session_id: input.sessionId,
        email: input.email || null,
        locale: input.locale,
        total_cents: input.totalCents,
        currency: input.currency.toLowerCase(),
        user_id: userId,
        payment_intent_id: input.paymentIntentId ?? null,
      })
      .select("id, token, user_id")
      .single();
    if (created.error) {
      // Carrera con otro aviso del mismo pago: se vuelve a leer el que ganó.
      const again = await admin.from("shop_orders").select("id, token, user_id").eq("stripe_session_id", input.sessionId).maybeSingle();
      if (again.error || !again.data) return { ok: false, status: 500 };
      order = again.data;
    } else {
      order = created.data;
      const rows = input.items.map((i) => {
        const p = bySlug.get(i.id);
        return {
          order_id: order!.id,
          product_id: p?.id ?? null,
          slug: i.id,
          name: p ? (input.locale === "es" ? p.name_es : p.name_en) : i.id,
          amount_cents: i.amountCents,
        };
      });
      const inserted = await admin.from("shop_order_items").insert(rows);
      if (inserted.error) return { ok: false, status: 500 };
    }
  }

  const downloads = await downloadsFor(admin, order!);
  return downloads ? { ok: true, downloads } : { ok: false, status: 500 };
}

export const refundSchema = z.object({
  paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]{5,200}$/),
  refundedCents: z.number().int().min(0).max(10_000_000),
});
export type RefundInput = z.infer<typeof refundSchema>;

/**
 * Anota un reembolso (Stripe avisa con el total devuelto de ese cobro, así que repetirlo no suma dos
 * veces). Si se devolvió todo, el enlace de descarga caduca al momento. 404 si no hay pedido con ese pago.
 */
export async function registerRefund(input: RefundInput, admin: Admin = createAdminClient()): Promise<{ ok: true } | { ok: false; status: 404 | 500 }> {
  const found = await admin.from("shop_orders").select("id, total_cents, refunded_cents").eq("payment_intent_id", input.paymentIntentId).maybeSingle();
  if (found.error) return { ok: false, status: 500 };
  if (!found.data) return { ok: false, status: 404 };

  const refunded = Math.min(input.refundedCents, found.data.total_cents);
  if (refunded === found.data.refunded_cents) return { ok: true };
  const patch: { refunded_cents: number; refunded_at: string | null; expires_at?: string } = {
    refunded_cents: refunded,
    refunded_at: refunded > 0 ? new Date().toISOString() : null,
  };
  if (refunded >= found.data.total_cents) patch.expires_at = new Date().toISOString();
  const updated = await admin.from("shop_orders").update(patch).eq("id", found.data.id);
  return updated.error ? { ok: false, status: 500 } : { ok: true };
}

/** Enlaces de un pedido ya registrado, por la sesión de Stripe. */
export async function getOrderBySession(sessionId: string, admin: Admin = createAdminClient()): Promise<OrderResult> {
  if (!SESSION.test(sessionId)) return { ok: false, status: 404 };
  const found = await admin.from("shop_orders").select("id, token").eq("stripe_session_id", sessionId).maybeSingle();
  if (found.error) return { ok: false, status: 500 };
  if (!found.data) return { ok: false, status: 404 };
  const downloads = await downloadsFor(admin, found.data);
  return downloads ? { ok: true, downloads } : { ok: false, status: 500 };
}

const TOKEN = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** URL firmada de 60 segundos para descargar un archivo comprado; 404 si el enlace no vale o caducó. */
export async function signDownload(
  token: string,
  slug: string,
  admin: Admin = createAdminClient(),
): Promise<{ ok: true; url: string } | { ok: false; status: 404 | 500 }> {
  if (!TOKEN.test(token) || !SLUG.test(slug)) return { ok: false, status: 404 };
  const order = await admin.from("shop_orders").select("id, expires_at").eq("token", token).maybeSingle();
  if (order.error) return { ok: false, status: 500 };
  if (!order.data || new Date(order.data.expires_at).getTime() < Date.now()) return { ok: false, status: 404 };

  const item = await admin.from("shop_order_items").select("product_id").eq("order_id", order.data.id).eq("slug", slug).maybeSingle();
  if (item.error) return { ok: false, status: 500 };
  if (!item.data?.product_id) return { ok: false, status: 404 };

  const product = await admin.from("products").select("file_path, file_name").eq("id", item.data.product_id).maybeSingle();
  if (product.error) return { ok: false, status: 500 };
  if (!product.data?.file_path) return { ok: false, status: 404 };

  const signed = await admin.storage
    .from("product-files")
    .createSignedUrl(product.data.file_path, 60, { download: product.data.file_name ?? true });
  if (signed.error || !signed.data) return { ok: false, status: 500 };
  return { ok: true, url: signed.data.signedUrl };
}
