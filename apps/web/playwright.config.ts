import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke e2e de la web pública. No necesita Supabase ni claves.
 * Compila y arranca en producción en un puerto propio (3100) para no chocar
 * con `pnpm dev` (3000) ni con la e2e de apps/app (3101).
 */
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm exec next start --hostname 127.0.0.1 --port ${PORT}`,
    url: `${BASE_URL}/es`,
    reuseExistingServer: !process.env.CI,
    // Sin Resend en la e2e: las solicitudes de /bookings se escriben en la consola
    // (ver src/lib/leads.ts). Nunca definir LEADS_LOG_ONLY en un despliegue real.
    // Las dos de Supabase vacías: aunque haya un .env.local, esta e2e prueba la web
    // con su respaldo estático (la web contra la plataforma tiene su propia suite).
    env: { LEADS_LOG_ONLY: "1", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
    timeout: 300_000,
  },
});
