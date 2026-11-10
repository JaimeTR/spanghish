// SOLO SUPABASE LOCAL. La clave de servicio local se usa únicamente aquí, en el
// código de prueba, para preparar contenido; la web nunca la recibe.
import { expect, type APIRequestContext } from "@playwright/test";

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} (lo define playwright.platform.config.ts).`);
  return value;
};

export const SUPABASE_URL = () => env("E2E_SUPABASE_URL");

/** Contenido de supabase/seed.sql. */
export const SEED = {
  lessons: { public: "colores-local", account: "saludos-local", enrolled: "preterito-local" },
} as const;

/** Ids fijos del contenido que crean (y borran) estas pruebas. */
export const E2E = {
  worksheet: "ee000000-0000-4000-8000-000000000001",
  worksheetFile: "ee000000-0000-4000-8000-0000000000f1",
  lesson: "ee000000-0000-4000-8000-000000000021",
  lessonSlug: "e2e-web-plataforma",
} as const;

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = env("E2E_SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

async function ok(response: Response, what: string) {
  if (!response.ok) throw new Error(`${what}: HTTP ${response.status} ${await response.text()}`);
}

/** Inserta o actualiza filas (PostgREST, como servicio). */
export async function upsert(table: string, rows: Record<string, unknown>[]) {
  const response = await fetch(`${SUPABASE_URL()}/rest/v1/${table}`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  await ok(response, `upsert ${table}`);
}

export async function update(table: string, id: string, values: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL()}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(values),
  });
  await ok(response, `update ${table}`);
}

export async function remove(table: string, id: string) {
  const response = await fetch(`${SUPABASE_URL()}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: serviceHeaders() });
  await ok(response, `delete ${table}`);
}

export async function uploadResourceFile(path: string, bytes: Uint8Array, mime: string) {
  const response = await fetch(`${SUPABASE_URL()}/storage/v1/object/resource-files/${path}`, {
    method: "POST",
    headers: { ...serviceHeaders({ "Content-Type": mime }), "x-upsert": "true" },
    body: new Blob([bytes.slice().buffer], { type: mime }),
  });
  await ok(response, "upload resource file");
}

export async function removeResourceFile(path: string) {
  await fetch(`${SUPABASE_URL()}/storage/v1/object/resource-files/${path}`, { method: "DELETE", headers: serviceHeaders() });
}

/** Un PDF mínimo y válido, suficiente para comprobar la descarga. */
export function tinyPdf(): Uint8Array {
  const text =
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
  return new TextEncoder().encode(text);
}

/** Avisa a la web de que el contenido cambió, como hace el portal al publicar. */
export async function revalidate(request: APIRequestContext) {
  const response = await request.post("/api/revalidate", { headers: { Authorization: `Bearer ${env("E2E_REVALIDATE_SECRET")}` } });
  expect(response.status()).toBe(200);
}

/**
 * Tras revalidar, Next sirve una vez más la copia anterior mientras regenera:
 * se pide la página hasta que el texto esperado aparece (o desaparece).
 */
export async function expectPageEventually(request: APIRequestContext, path: string, text: string, present = true) {
  await expect
    .poll(async () => (await (await request.get(path)).text()).includes(text), { timeout: 20_000, intervals: [300, 600, 1000] })
    .toBe(present);
}
