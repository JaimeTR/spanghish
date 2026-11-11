import { isAuthorized, orderSchema, registerOrder } from "@/lib/shop/orders";

/**
 * POST /api/shop/orders — la web avisa de un pedido pagado (Authorization:
 * Bearer WEB_REVALIDATE_SECRET). Idempotente por sesión de Stripe. Responde con
 * los enlaces de descarga (rutas relativas a este portal).
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
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400, headers: HEADERS });

  const result = await registerOrder(parsed.data);
  if (!result.ok) return Response.json({ error: "failed" }, { status: result.status, headers: HEADERS });
  return Response.json({ downloads: result.downloads }, { headers: HEADERS });
}
