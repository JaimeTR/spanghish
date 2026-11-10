import { signPublicResourceFile } from "@/lib/resource-file";

/**
 * Descarga de un recurso público: redirige a una URL firmada de corta duración.
 * Lo restringido o inexistente responde 404 (sin distinguir uno de otro).
 */
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const signed = await signPublicResourceFile(id);
  if (!signed.ok) {
    return new Response(signed.status === 404 ? "Not found" : "Service unavailable", { status: signed.status, headers: HEADERS });
  }
  return new Response(null, { status: 302, headers: { ...HEADERS, Location: signed.url } });
}
