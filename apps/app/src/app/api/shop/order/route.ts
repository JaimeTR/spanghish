import { getOrderBySession, isAuthorized } from "@/lib/shop/orders";

/** GET /api/shop/order?session_id=… — enlaces de un pedido ya registrado (mismo secreto que POST /orders). */
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"), process.env.WEB_REVALIDATE_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: HEADERS });
  }
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  const result = await getOrderBySession(sessionId);
  if (!result.ok) return Response.json({ error: "not_found" }, { status: result.status, headers: HEADERS });
  return Response.json({ downloads: result.downloads }, { headers: HEADERS });
}
