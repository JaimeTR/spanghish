import { getRpc, platformEnv, supabaseHeaders } from "./platform";

/**
 * Descarga de un recurso público con archivo. El archivo vive en un bucket
 * privado: la web pregunta a la plataforma (como visitante anónimo) si puede
 * verlo y, solo entonces, pide una URL firmada de corta duración. Nunca se usa
 * la clave de servicio ni se adivina la ruta del archivo.
 */

type Env = Partial<Record<string, string | undefined>>;

export type SignedFile = { ok: true; url: string } | { ok: false; status: 404 | 503 };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "resource-files";
/** Segundos de validez del enlace: lo justo para empezar la descarga. */
export const SIGNED_URL_SECONDS = 120;
const TIMEOUT_MS = 3000;

export async function signPublicResourceFile(
  id: string,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<SignedFile> {
  if (!UUID.test(id)) return { ok: false, status: 404 };
  const cfg = platformEnv(env);
  if (!cfg) return { ok: false, status: 503 };

  // Sin caché: el permiso se comprueba en cada descarga.
  const path = await getRpc<string | null>("resource_file_path", { p_resource_id: id }, env, fetchImpl, { cache: "no-store" });
  if (!path.ok) return { ok: false, status: 503 };
  if (typeof path.data !== "string" || path.data.length === 0 || path.data.split("/").includes("..")) {
    return { ok: false, status: 404 };
  }

  const object = path.data.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetchImpl(`${cfg.url}/storage/v1/object/sign/${BUCKET}/${object}`, {
      method: "POST",
      headers: supabaseHeaders(cfg.key),
      body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`[platform] sign resource file: HTTP ${response.status}`);
      return { ok: false, status: response.status >= 500 ? 503 : 404 };
    }
    const body = (await response.json()) as { signedURL?: unknown; signedUrl?: unknown };
    const signed = typeof body.signedURL === "string" ? body.signedURL : typeof body.signedUrl === "string" ? body.signedUrl : null;
    if (!signed || !signed.startsWith("/object/sign/")) return { ok: false, status: 503 };
    // `download`: el navegador lo guarda como archivo en vez de abrirlo en la página.
    return { ok: true, url: `${cfg.url}/storage/v1${signed}${signed.includes("?") ? "&" : "?"}download=` };
  } catch (error) {
    console.error(`[platform] sign resource file: ${error instanceof Error ? error.name : "error"}`);
    return { ok: false, status: 503 };
  }
}
