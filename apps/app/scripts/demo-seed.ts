/**
 * Datos de demostración para el proyecto de Supabase de la demo.
 *
 *   pnpm --filter @spanglish/app demo:seed --dry-run   (valida y dice qué haría)
 *   pnpm --filter @spanglish/app demo:seed             (crea o actualiza)
 *   pnpm --filter @spanglish/app demo:seed remove      (borra lo que creó)
 *
 * Lee apps/app/.env.demo.local (git lo ignora). Solo escribe en un proyecto
 * https://<ref>.supabase.co cuyo ref coincida con DEMO_SEED_PROJECT_REF; en
 * local se usa supabase/seed.sql. Nunca imprime contraseñas ni claves.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@spanglish/db";
import { assertDemoTarget, buildDemoContent, demoUsers, parseArgs } from "../src/lib/demo/demo-data";
import { describePlan, removeDemo, seedDemo } from "../src/lib/demo/demo-run";

async function main(): Promise<void> {
  const { command, dryRun } = parseArgs(process.argv.slice(2));
  const target = assertDemoTarget(process.env);
  const users = demoUsers(process.env);
  const content = buildDemoContent();
  console.log(`Proyecto de demo: ${target.projectRef}`);

  if (dryRun) {
    console.log("En seco: no se escribe nada.");
    for (const line of describePlan(command, users, content)) console.log(`- ${line}`);
    return;
  }

  const client = createClient<Database>(target.url, target.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  // pnpm ejecuta el script desde apps/app: el logo está en la raíz del repo.
  const logo = () => readFile(path.resolve(process.cwd(), "../../brand/logo-spanglish.png"));
  const summary = command === "remove" ? await removeDemo(client, users, content) : await seedDemo(client, users, content, new Uint8Array(await logo()));
  console.log(command === "remove" ? "Datos de demo retirados:" : "Datos de demo listos:");
  for (const line of summary) console.log(`- ${line}`);
}

main().catch((error: unknown) => {
  // El mensaje dice en qué paso falló; nunca incluye claves ni contraseñas.
  console.error(`No se pudo completar: ${error instanceof Error ? error.message : "error desconocido"}`);
  process.exitCode = 1;
});
