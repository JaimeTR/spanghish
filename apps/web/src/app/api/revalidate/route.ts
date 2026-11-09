import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { WEB_CONTENT_TAG } from "@/lib/platform";

/**
 * La administración (apps/app) avisa aquí cuando cambia algo publicado, para
 * que la web no espere a que caduque la caché. Autenticación: secreto compartido
 * en `Authorization: Bearer` (WEB_REVALIDATE_SECRET). Sin secreto configurado, cerrado.
 */
export async function POST(request: Request) {
  const secret = process.env.WEB_REVALIDATE_SECRET;
  if (!secret) return Response.json({ ok: false }, { status: 503 });

  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ ok: false }, { status: 401 });

  revalidateTag(WEB_CONTENT_TAG, "max");
  return Response.json({ ok: true });
}
