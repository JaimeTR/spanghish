import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// e2e/ es de Playwright (pnpm e2e), no de Vitest.
// Entorno node por defecto; los tests de componentes declaran
// `// @vitest-environment jsdom` en su primera línea.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
