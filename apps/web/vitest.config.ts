import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// e2e/ es de Playwright (pnpm e2e), no de Vitest.
export default defineConfig({
  // tsconfig usa jsx "preserve" (lo compila Next): las pruebas de componentes necesitan el runtime automático.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", exclude: [...configDefaults.exclude, "e2e/**"] },
});
