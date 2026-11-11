import { isAuthorized, refundSchema, registerRefund } from "@/lib/shop/orders";

/**
 * POST /api/shop/refunds — la web avisa de un reembolso de Stripe (Authorization:
 * Bearer WEB_REVALIDATE_SECRET). Anota lo devuelto en el pedido y, si es el total,
 * caduca el enlace de descarga.
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
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400, headers: HEADERS });

  const result = await registerRefund(parsed.data);
  if (!result.ok) return Response.json({ error: "failed" }, { status: result.status, headers: HEADERS });
  return Response.json({ ok: true }, { headers: HEADERS });
}
