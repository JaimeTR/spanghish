/**
 * Comprobación de las variables de entorno de la web pública. La usa
 * next.config.ts al compilar en Vercel: lo peligroso (una clave de servicio en
 * la web, un par a medias, un secreto corto) detiene el build con un mensaje
 * legible; lo que solo falta se avisa y la web sigue con sus valores por
 * defecto y su respaldo estático. Los mensajes nunca incluyen valores.
 */

export type Env = Record<string, string | undefined>;
export type EnvCheck = { ok: true; warnings: string[] } | { ok: false; problems: string[]; warnings: string[] };

/** Todas las variables que lee la web (docs/despliegue.md debe documentarlas todas). */
export const WEB_ENV_NAMES = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WEB_REVALIDATE_SECRET",
  "SITE_NOINDEX",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "LEAD_TO_EMAIL",
  "LEAD_FROM_EMAIL",
  "LEADS_LOG_ONLY",
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

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function checkWebEnv(env: Env): EnvCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  const onVercel = env.VERCEL === "1";
  const demo = env.SITE_NOINDEX === "1";

  for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL"]) {
    if (!set(env, name)) warnings.push(`${name}: no definida; se usa la dirección por defecto del sitio real.`);
    else if (onVercel && !isHttps(env[name]!)) problems.push(`${name}: debe ser una URL https://.`);
  }

  if (set(env, "SUPABASE_SERVICE_ROLE_KEY")) {
    problems.push("SUPABASE_SERVICE_ROLE_KEY: la clave de servicio no puede estar en la web; quítala de este proyecto.");
  }
  const url = set(env, "NEXT_PUBLIC_SUPABASE_URL");
  const key = set(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (url !== key) {
    problems.push(`${url ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "NEXT_PUBLIC_SUPABASE_URL"}: falta; las dos variables de Supabase van juntas.`);
  } else if (!url) {
    warnings.push("Sin Supabase: la web usa su contenido de respaldo (no lee la plataforma).");
  }
  if (key && isServiceKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)) {
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY: es una clave de servicio; aquí va la clave pública (anon o publishable).");
  }
  if (url && onVercel && !isHttps(env.NEXT_PUBLIC_SUPABASE_URL!)) problems.push("NEXT_PUBLIC_SUPABASE_URL: debe ser una URL https://.");

  if (set(env, "WEB_REVALIDATE_SECRET") && env.WEB_REVALIDATE_SECRET!.length < MIN_SECRET_LENGTH) {
    problems.push(`WEB_REVALIDATE_SECRET: debe tener ${MIN_SECRET_LENGTH} caracteres o más.`);
  }

  const stripeKey = set(env, "STRIPE_SECRET_KEY");
  const stripeHook = set(env, "STRIPE_WEBHOOK_SECRET");
  if (stripeKey !== stripeHook) {
    problems.push(`${stripeKey ? "STRIPE_WEBHOOK_SECRET" : "STRIPE_SECRET_KEY"}: falta; las dos variables de Stripe van juntas.`);
  } else if (!stripeKey) {
    warnings.push("Sin Stripe: la tienda avisa de que los pagos no están activos.");
  }
  if (stripeKey && demo && env.STRIPE_SECRET_KEY!.startsWith("sk_live_")) {
    problems.push("STRIPE_SECRET_KEY: es una clave real (live) en un entorno de demostración (SITE_NOINDEX=1); usa una de prueba.");
  }

  const resend = ["RESEND_API_KEY", "LEAD_TO_EMAIL", "LEAD_FROM_EMAIL"];
  const missingResend = resend.filter((name) => !set(env, name));
  if (missingResend.length === resend.length) {
    warnings.push("Sin Resend: el formulario de clase gratis avisa de que no está disponible.");
  } else {
    for (const name of missingResend) problems.push(`${name}: falta; las tres variables del correo de solicitudes van juntas.`);
  }

  if (env.LEADS_LOG_ONLY === "1" && onVercel && env.VERCEL_ENV === "production" && !demo) {
    problems.push("LEADS_LOG_ONLY: no puede estar activa en un sitio real (las solicitudes se perderían en el registro).");
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
