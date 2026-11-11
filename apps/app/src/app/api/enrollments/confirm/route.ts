import { confirmPaidRequest, confirmSchema } from "@/lib/enrollments/confirm";
import { isAuthorized } from "@/lib/shop/orders";

/**
 * POST /api/enrollments/confirm — la web avisa de una prematrícula pagada con tarjeta
 * (Authorization: Bearer WEB_REVALIDATE_SECRET), tras comprobar el pago con Stripe.
 * Idempotente: crea la ficha, la matrícula, el pago y la cuenta una sola vez.
 */
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"), process.env.WEB_REVALIDATE_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: HEADERS });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400, headers: HEADERS });
  }
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400, headers: HEADERS });

  const result = await confirmPaidRequest(parsed.data);
  if (!result.ok) return Response.json({ error: "failed" }, { status: result.status, headers: HEADERS });
  return Response.json({ ok: true, accountLinked: result.accountLinked }, { headers: HEADERS });
}
