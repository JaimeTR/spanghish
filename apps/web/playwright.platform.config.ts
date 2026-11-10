import { execSync } from "node:child_process";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * e2e de la web CONTRA LA PLATAFORMA: Supabase local (`pnpm supabase start` +
 * `pnpm supabase db reset`). La suite normal (playwright.config.ts) prueba la
 * web con su respaldo estático; esta, que lea lo publicado.
 *
 * Las claves no se guardan en el repo: salen de `pnpm supabase status -o env`.
 * La clave de servicio local solo la usa el código de prueba (e2e-platform/helpers.ts)
 * para publicar filas y subir un archivo; el servidor de la web nunca la recibe.
 * Nunca apuntar estas pruebas a un proyecto remoto: crean y borran contenido.
 */
const PORT = 3102;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const repoRoot = path.resolve(__dirname, "../..");

function localSupabaseEnv(): Record<string, string> {
  const raw = execSync("pnpm -s supabase status -o env", { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (m) env[m[1]!] = m[2]!;
  }
  return env;
}

const local = localSupabaseEnv();
const supabaseUrl = local.API_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl)) {
  throw new Error("Las e2e de plataforma solo corren contra Supabase local (¿falta `pnpm supabase start`?).");
}

/** Secreto de revalidación solo para esta ejecución local (32 caracteres o más). */
export const E2E_REVALIDATE_SECRET = "e2e-platform-revalidate-secret-0123456789";

// Para el código de prueba (helpers.ts). No se pasan al servidor de la web.
process.env.E2E_SUPABASE_URL = supabaseUrl;
process.env.E2E_SUPABASE_ANON_KEY = local.ANON_KEY ?? "";
process.env.E2E_SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY ?? "";
process.env.E2E_REVALIDATE_SECRET = E2E_REVALIDATE_SECRET;

export default defineConfig({
  testDir: "./e2e-platform",
  // Secuencial: las pruebas publican contenido y comparten la caché de la web.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm exec next start --hostname 127.0.0.1 --port ${PORT}`,
    url: `${BASE_URL}/es`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY ?? "",
      // La web jamás recibe la clave de servicio (y el .env.local no puede colarla).
      SUPABASE_SERVICE_ROLE_KEY: "",
      WEB_REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
      // Como un entorno de demostración: fuera de buscadores.
      SITE_NOINDEX: "1",
      LEADS_LOG_ONLY: "1",
    },
  },
});
