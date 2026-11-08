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
    timeout: 300_000,
  },
});
