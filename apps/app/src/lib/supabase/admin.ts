import "server-only";
import type { Database } from "@spanglish/db";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con la service_role: se salta RLS. SOLO para crear cuentas de Auth
 * (`lib/people/provision.ts`, regla de ESLint), y siempre DESPUÉS de comprobar
 * que quien llama es admin (`requireArea(locale, "admin")`). La clave nunca
 * llega al navegador (sin prefijo NEXT_PUBLIC_ y `server-only`).
 */
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (ver .env.example).");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
