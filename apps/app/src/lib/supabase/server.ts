import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createClient() {
  // cookies() primero: marca la ruta como dinámica antes de exigir las variables,
  // así `next build` no intenta prerenderizar páginas con sesión (ni falla sin env).
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient(url, anonKey, {
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
