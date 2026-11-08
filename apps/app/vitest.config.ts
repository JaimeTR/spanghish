import { configDefaults, defineConfig } from "vitest/config";

// e2e/ es de Playwright (pnpm e2e), no de Vitest.
export default defineConfig({
  test: { environment: "node", exclude: [...configDefaults.exclude, "e2e/**"] },
});
