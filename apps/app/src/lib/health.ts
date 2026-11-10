import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Env = Record<string, string | undefined>;

export type HealthReport = {
  status: "ok" | "degraded";
  app: "app";
  /** Commit desplegado (7 caracteres) o null fuera de Vercel. */
  commit: string | null;
  /** El portal nunca se indexa. */
  indexing: false;
  db: "ok" | "not_configured" | "unreachable";
};

type PingClient = Pick<SupabaseClient, "rpc">;

/** ¿Responde la base? Usa health_ping (siempre true), sin sesión ni datos. */
export async function checkDatabase(client: PingClient): Promise<"ok" | "unreachable"> {
  try {
    const { data, error } = await client.rpc("health_ping").abortSignal(AbortSignal.timeout(3000));
    return !error && data === true ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}

/** Cliente anónimo sin cookies ni sesión: solo para la comprobación de salud. */
function anonClient(env: Env): PingClient | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

/** Informe de salud del portal: sin datos ni variables. Sin base, el portal no funciona: degradado. */
export async function healthReport(env: Env = process.env, client: PingClient | null = anonClient(env)): Promise<HealthReport> {
  const db = client ? await checkDatabase(client) : "not_configured";
  return {
    status: db === "ok" ? "ok" : "degraded",
    app: "app",
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    indexing: false,
    db,
  };
}
