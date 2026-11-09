import "server-only";
import type { Database } from "@spanglish/db";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createClient(): Promise<SupabaseClient<Database>> {
  // cookies() primero: marca la ruta como dinámica antes de exigir las variables,
  // así `next build` no intenta prerenderizar páginas con sesión (ni falla sin env).
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component: la renovación de cookies la hace proxy.ts.
        }
      },
    },
  });
}
