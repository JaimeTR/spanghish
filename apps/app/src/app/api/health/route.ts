import { healthReport } from "@/lib/health";

/**
 * Comprobación de salud: un informe, no un control de acceso. Vive bajo /api,
 * fuera del guard del proxy, a propósito: siempre 200, sin caché, sin datos ni
 * variables.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await healthReport(), { headers: { "Cache-Control": "no-store" } });
}
