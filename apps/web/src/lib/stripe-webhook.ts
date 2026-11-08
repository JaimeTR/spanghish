import Stripe from "stripe";
import { isLocale, routing } from "../i18n/routing";
import { deliverLead, type DeliveryResult, type OrderLead } from "./leads";
import { findProduct } from "./shop";

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
};

/** Pedido a partir de la sesión: productos y precios de lib/shop.ts, importes cobrados de Stripe. */
export function orderFromSession(session: Stripe.Checkout.Session): OrderLead {
  const ids = (session.metadata?.productIds ?? "").split(",").filter(Boolean);
  const metaLocale = session.metadata?.locale ?? "";
  const locale = isLocale(metaLocale) ? metaLocale : routing.defaultLocale;
  return {
    kind: "order",
    locale,
    email: session.customer_details?.email ?? session.customer_email ?? "",
    sessionId: session.id,
    items: ids.map((id) => {
      const p = findProduct(id);
      return { id, name: p ? p.name.en : "Unknown product", amountCents: p?.priceCents ?? 0 };
    }),
    totalCents: session.amount_total ?? 0,
    currency: session.currency ?? "aud",
  };
}

export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
  { env = process.env, deliver = (lead) => deliverLead(lead) }: WebhookDeps = {},
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

  // Los métodos de pago diferidos completan la sesión antes de cobrar y avisan
  // después con async_payment_succeeded: solo se notifica lo ya pagado.
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return { status: 200, body: "Ignored" };
  }
  const session = event.data.object;
  if (session.payment_status !== "paid") return { status: 200, body: "Not paid yet" };

  const result = await deliver(orderFromSession(session));
  if (!result.ok) return { status: 500, body: "Order notification failed" };
  return { status: 200, body: "OK" };
}
