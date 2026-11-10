/**
 * Comprobación de las variables de entorno del portal. La usa next.config.ts al
 * compilar en Vercel: si falta algo sin lo que el portal no funciona, o hay
 * algo peligroso (una clave de servicio donde va la pública), el build se
 * detiene con un mensaje legible. Los mensajes nunca incluyen valores.
 */

export type Env = Record<string, string | undefined>;
export type EnvCheck = { ok: true; warnings: string[] } | { ok: false; problems: string[]; warnings: string[] };

/** Todas las variables que lee el portal (docs/despliegue.md debe documentarlas todas). */
export const APP_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_WEB_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WEB_REVALIDATE_URL",
  "WEB_REVALIDATE_SECRET",
] as const;

export const MIN_SECRET_LENGTH = 32;

const set = (env: Env, name: string) => (env[name] ?? "").trim().length > 0;

/** ¿La clave es de servicio? (JWT con role service_role, o las nuevas sb_secret_…) */
export function isServiceKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: unknown };
    return claims.role === "service_role";
  } catch {
    return false;
  }
}

function httpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function checkAppEnv(env: Env): EnvCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  const onVercel = env.VERCEL === "1";

  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"]) {
    if (!set(env, name)) problems.push(`${name}: falta; el portal no funciona sin ella.`);
  }
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_WEB_URL"]) {
    if (set(env, name) && onVercel && !httpsUrl(env[name]!)) problems.push(`${name}: debe ser una URL https://.`);
  }
  if (set(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY") && isServiceKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)) {
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY: es una clave de servicio; aquí va la clave pública (anon o publishable), que llega al navegador.");
  }

  if (!set(env, "SUPABASE_SERVICE_ROLE_KEY")) {
    if (onVercel) problems.push("SUPABASE_SERVICE_ROLE_KEY: falta; sin ella la administración no puede crear cuentas.");
    else warnings.push("SUPABASE_SERVICE_ROLE_KEY: no definida; la administración no podrá crear cuentas.");
  }
  if (!set(env, "NEXT_PUBLIC_WEB_URL")) {
    warnings.push("NEXT_PUBLIC_WEB_URL: no definida; los enlaces a la web pública usan la dirección por defecto.");
  }

  const url = set(env, "WEB_REVALIDATE_URL");
  const secret = set(env, "WEB_REVALIDATE_SECRET");
  if (url !== secret) {
    problems.push(`${url ? "WEB_REVALIDATE_SECRET" : "WEB_REVALIDATE_URL"}: falta; las dos variables de revalidación van juntas.`);
  } else if (!url) {
    warnings.push("Sin revalidación: la web tarda hasta 5 minutos en mostrar lo que se publica.");
  }
  if (url) {
    const parsed = httpsUrl(env.WEB_REVALIDATE_URL!);
    const local = !onVercel && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/api\/revalidate$/.test(env.WEB_REVALIDATE_URL!);
    if (!local && (!parsed || parsed.pathname !== "/api/revalidate")) {
      problems.push("WEB_REVALIDATE_URL: debe ser https://<web>/api/revalidate.");
    }
  }
  if (secret && env.WEB_REVALIDATE_SECRET!.length < MIN_SECRET_LENGTH) {
    problems.push(`WEB_REVALIDATE_SECRET: debe tener ${MIN_SECRET_LENGTH} caracteres o más.`);
  }

  return problems.length > 0 ? { ok: false, problems, warnings } : { ok: true, warnings };
}

/** Lanza si hay problemas (mensaje legible para el log del build); los avisos van a la consola. */
export function assertEnv(check: EnvCheck, app: "web" | "app"): void {
  for (const warning of check.warnings) console.warn(`[env ${app}] aviso: ${warning}`);
  if (!check.ok) {
    throw new Error(`Variables de entorno de ${app} inválidas:\n${check.problems.map((problem) => `- ${problem}`).join("\n")}`);
  }
}
