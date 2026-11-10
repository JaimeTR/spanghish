import { indexingEnabled } from "./indexing";
import { getRpc } from "./platform";

type Env = Record<string, string | undefined>;

export type HealthReport = {
  status: "ok" | "degraded";
  app: "web";
  /** Commit desplegado (7 caracteres) o null fuera de Vercel. */
  commit: string | null;
  indexing: boolean;
  db: "ok" | "not_configured" | "unreachable";
};

/**
 * Informe de salud de la web: sin datos ni variables. Sin plataforma
 * configurada la web está bien (usa su respaldo); configurada y sin responder,
 * degradada.
 */
export async function healthReport(env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<HealthReport> {
  const ping = await getRpc<unknown>("health_ping", {}, env, fetchImpl, { cache: "no-store" });
  const db = ping.ok ? (ping.data === true ? "ok" : "unreachable") : ping.reason === "not_configured" ? "not_configured" : "unreachable";
  return {
    status: db === "unreachable" ? "degraded" : "ok",
    app: "web",
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    indexing: indexingEnabled(env),
    db,
  };
}
