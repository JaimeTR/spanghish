import Stripe from "stripe";
import { isLocale, routing } from "../i18n/routing";
import { deliverLead, type DeliveryResult, type OrderLead } from "./leads";
import { findProduct, PRODUCTS, type Product } from "./shop";
import { getShopProducts } from "./shop-source";
import { enrolmentRequestIdOf, recordEnrolmentPayment } from "./enrol";
import { recordShopOrder, recordShopRefund } from "./shop-orders";

/**
 * Webhook de Stripe (POST /api/stripe/webhook). Verifica la firma con
 * STRIPE_WEBHOOK_SECRET sobre el cuerpo SIN parsear; si no cuadra, 400.
 *
 * checkout.session.completed (pagado): email a Maribel con el pedido vía
 * lib/leads.ts. La ENTREGA DE LOS ARCHIVOS ES MANUAL (fase 1): Maribel los envía
 * por email. Fase 2: guardar el pedido, generar enlaces firmados a un
 * almacenamiento privado y enviarlos al cliente desde aquí.
 *
 * Idempotencia: no hay base de datos de pedidos todavía, así que la única
 * consecuencia de un reenvío de Stripe es un email repetido con el mismo id de
 * sesión en el asunto (el email lo indica). Si el email no sale, se responde 500
 * para que Stripe lo reintente.
 */
export type WebhookResponse = { status: number; body: string };

type Env = Partial<Record<string, string | undefined>>;

export type WebhookDeps = {
  env?: Env;
  deliver?: (lead: OrderLead) => Promise<DeliveryResult>;
  /** Productos a la venta (por defecto, los de la base de datos o el respaldo fijo). */
  products?: readonly Product[];
  /** Registra el pedido en el portal y devuelve los enlaces de descarga (null si no se pudo). */
  record?: (lead: OrderLead) => Promise<{ name: string; url: string }[] | null>;
  /** Anota en el portal lo reembolsado de un pago (true si quedó registrado). */
  refund?: (paymentIntentId: string, refundedCents: number) => Promise<boolean>;
  /** Confirma en el portal una prematrícula pagada (true si quedó registrada). */
  enrol?: (session: Stripe.Checkout.Session) => Promise<boolean>;
};

/** Pedido a partir de la sesión: productos y precios de lib/shop.ts, importes cobrados de Stripe. */
export function orderFromSession(session: Stripe.Checkout.Session, products: readonly Product[] = PRODUCTS): OrderLead {
  const ids = (session.metadata?.productIds ?? "").split(",").filter(Boolean);
  const metaLocale = session.metadata?.locale ?? "";
  const locale = isLocale(metaLocale) ? metaLocale : routing.defaultLocale;
  return {
    kind: "order",
    locale,
    email: session.customer_details?.email ?? session.customer_email ?? "",
    sessionId: session.id,
    ...(typeof session.payment_intent === "string" ? { paymentIntentId: session.payment_intent } : {}),
    items: ids.map((id) => {
      const p = findProduct(id, products);
      return { id, name: p ? p.name.en : "Unknown product", amountCents: p?.priceCents ?? 0 };
    }),
    totalCents: session.amount_total ?? 0,
    currency: session.currency ?? "aud",
  };
}

export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
  {
    env = process.env,
    deliver = (lead) => deliverLead(lead),
    products,
    record = (lead) => recordShopOrder(lead, env),
    refund = (intent, cents) => recordShopRefund(intent, cents, env),
    enrol = (session) => recordEnrolmentPayment(session, env),
  }: WebhookDeps = {},
): Promise<WebhookResponse> {
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[stripe] Falta STRIPE_WEBHOOK_SECRET: webhook rechazado");
    return { status: 400, body: "Webhook not configured" };
  }
  if (!signature) return { status: 400, body: "Missing Stripe-Signature" };

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return { status: 400, body: "Invalid signature" };
  }

  // Reembolsos: el portal anota lo devuelto y, si es el total, caduca la descarga. Si falla, Stripe reintenta.
  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (!intent) return { status: 200, body: "Ignored" };
    const ok = await refund(intent, charge.amount_refunded);
    return ok ? { status: 200, body: "OK" } : { status: 500, body: "Refund not recorded" };
  }

  // Los métodos de pago diferidos completan la sesión antes de cobrar y avisan
  // después con async_payment_succeeded: solo se notifica lo ya pagado.
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return { status: 200, body: "Ignored" };
  }
  const session = event.data.object;
  if (session.payment_status !== "paid") return { status: 200, body: "Not paid yet" };

  // Pago de una prematrícula: el portal crea la matrícula (idempotente). Si falla, Stripe reintenta.
  if (enrolmentRequestIdOf(session)) {
    return (await enrol(session)) ? { status: 200, body: "OK" } : { status: 500, body: "Enrollment not recorded" };
  }

  const order = orderFromSession(session, products ?? (await getShopProducts(env)));
  // Primero se registra en el portal (idempotente) para que el aviso lleve los enlaces; si falla, sigue el aviso normal.
  const downloads = await record(order);
  const result = await deliver(downloads && downloads.length > 0 ? { ...order, downloads } : order);
  // El pedido ya quedó registrado en el portal (descargas incluidas): que falle solo el aviso por correo
  // (p. ej. Resend sin configurar) no debe hacer que Stripe reintente el webhook sin parar.
  if (!result.ok && downloads === null) return { status: 500, body: "Order notification failed" };
  return { status: 200, body: "OK" };
}
