import { revalidateTag } from "next/cache";
import { WEB_CONTENT_TAG } from "@/lib/platform";
import { hasRevalidateSecret, isAuthorizedRevalidate } from "@/lib/revalidate";

/**
 * La administración (apps/app) avisa aquí cuando cambia algo publicado, para
 * que la web no espere a que caduque la caché. Autenticación: secreto compartido
 * en `Authorization: Bearer` (WEB_REVALIDATE_SECRET, 32 caracteres o más).
 * Sin secreto configurado, cerrado.
 */
export async function POST(request: Request) {
  const secret = process.env.WEB_REVALIDATE_SECRET;
  if (!hasRevalidateSecret(secret)) return Response.json({ ok: false }, { status: 503 });
  if (!isAuthorizedRevalidate(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  revalidateTag(WEB_CONTENT_TAG, "max");
  return Response.json({ ok: true });
}
