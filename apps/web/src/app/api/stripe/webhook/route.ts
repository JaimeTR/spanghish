import { handleStripeWebhook } from "@/lib/stripe-webhook";

/**
 * Webhook de Stripe. Cuerpo sin parsear (la firma se calcula sobre los bytes
 * exactos). La entrega de los archivos es manual: ver lib/stripe-webhook.ts.
 * En local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const { status, body } = await handleStripeWebhook(raw, request.headers.get("stripe-signature"));
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
