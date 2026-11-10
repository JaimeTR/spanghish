import "server-only";
import type { Database } from "@spanglish/db";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";
import { SESSION_ONLY_COOKIE, withSessionPreference } from "./session-preference";

/**
 * `sessionOnly`: cookies de sesión que se borran al cerrar el navegador. Sin
 * indicarlo se respeta la preferencia guardada al iniciar sesión.
 */
export async function createClient(options: { sessionOnly?: boolean } = {}): Promise<SupabaseClient<Database>> {
  // cookies() primero: marca la ruta como dinámica antes de exigir las variables,
  // así `next build` no intenta prerenderizar páginas con sesión (ni falla sin env).
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  const sessionOnly = options.sessionOnly ?? cookieStore.get(SESSION_ONLY_COOKIE)?.value === "1";
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options: cookie }) => cookieStore.set(name, value, withSessionPreference(value, cookie, sessionOnly)));
        } catch {
          // Server Component: la renovación de cookies la hace proxy.ts.
        }
      },
    },
  });
}
