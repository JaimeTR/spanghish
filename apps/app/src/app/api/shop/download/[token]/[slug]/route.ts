import { signDownload } from "@/lib/shop/orders";

/**
 * GET /api/shop/download/<token>/<producto> — descarga de un archivo comprado.
 * El token largo del pedido es el permiso: si no vale o caducó, 404 (sin
 * distinguir un caso de otro). Redirige a una URL firmada de 60 segundos.
 */
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };

export async function GET(_request: Request, { params }: { params: Promise<{ token: string; slug: string }> }) {
  const { token, slug } = await params;
  const signed = await signDownload(token, slug);
  if (!signed.ok) {
    return new Response(signed.status === 404 ? "Not found" : "Service unavailable", { status: signed.status, headers: HEADERS });
  }
  return new Response(null, { status: 302, headers: { ...HEADERS, Location: signed.url } });
}
