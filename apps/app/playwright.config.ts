import { execSync } from "node:child_process";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * e2e contra el stack LOCAL de Supabase (`pnpm supabase start` + `pnpm supabase db reset`).
 *
 * Las claves no se guardan en el repo. Se toman, por orden:
 *   1. de variables de entorno ya definidas (NEXT_PUBLIC_SUPABASE_URL,
 *      NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY), o
 *   2. de `pnpm supabase status -o env` (API_URL, ANON_KEY, SERVICE_ROLE_KEY),
 *      que se ejecuta aquí automáticamente desde la raíz del repo.
 * Nunca apuntar estas pruebas a un proyecto remoto: crean y borran usuarios.
 */
const PORT = 3101;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const repoRoot = path.resolve(__dirname, "../..");

function localSupabaseEnv(): Record<string, string> {
  const raw = execSync("pnpm -s supabase status -o env", {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (m) env[m[1]!] = m[2]!;
  }
  return env;
}

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  const local = localSupabaseEnv();
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= local.API_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= local.ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= local.SERVICE_ROLE_KEY;
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl)) {
  throw new Error(`Las e2e solo corren contra Supabase local (NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}).`);
}

export default defineConfig({
  testDir: "./e2e",
  // Secuencial: comparten usuarios del seed y el límite de logins de GoTrue.
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
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      // Solo servidor (lib/supabase/admin.ts): alta de cuentas por la administradora.
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    },
  },
});
