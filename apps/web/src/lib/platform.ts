/**
 * Cliente de la plataforma (Supabase) para la web pública. La web no tiene
 * privilegios de tabla: lee con la clave anónima por funciones RPC que solo
 * devuelven lo publicado. Si la plataforma no está configurada o falla, quien
 * llama usa su respaldo estático: la web nunca se rompe ni se queda vacía.
 */

/** Etiqueta de caché de todo lo que lee la web de la plataforma (la invalida /api/revalidate). */
export const WEB_CONTENT_TAG = "platform-content";

/** Segundos de caché de las lecturas; la administración la salta con /api/revalidate. */
export const PLATFORM_REVALIDATE_SECONDS = 300;

const TIMEOUT_MS = 3000;

type Env = Partial<Record<string, string | undefined>>;

export type RpcResult<T> = { ok: true; data: T } | { ok: false; reason: "not_configured" | "failed" };

function config(env: Env): { url: string; key: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/** Cabeceras de la API: `apikey` siempre; `Authorization: Bearer` solo con claves JWT (las sb_publishable_ no lo son). */
export function supabaseHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (key.split(".").length === 3) headers.Authorization = `Bearer ${key}`;
  return headers;
}

/** Llama a una función RPC pública. Nunca lanza: devuelve `{ ok: false }` si no hay configuración o falla. */
export async function getRpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<RpcResult<T>> {
  const cfg = config(env);
  if (!cfg) return { ok: false, reason: "not_configured" };
  try {
    const response = await fetchImpl(`${cfg.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: supabaseHeaders(cfg.key),
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: PLATFORM_REVALIDATE_SECONDS, tags: [WEB_CONTENT_TAG] },
    });
    if (!response.ok) return { ok: false, reason: "failed" };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** URL pública de un archivo del bucket público `content-media` (fotos de docentes). null si no hay ruta o configuración. */
export function contentMediaUrl(path: string | null | undefined, env: Env = process.env): string | null {
  const cfg = config(env);
  if (!path || !cfg) return null;
  return `${cfg.url}/storage/v1/object/public/content-media/${path}`;
}
