import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Credenciales públicas de Supabase; null si la web no las tiene (entonces no hay "Mis compras"). */
export function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

/** Cliente de Supabase con la sesión de la persona (cookies). Solo clave anónima: nunca la de servicio. */
export async function createClient() {
  const env = supabaseEnv();
  if (!env) return null;
  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Desde un Server Component no se pueden fijar cookies; el proxy ya renueva la sesión.
        }
      },
    },
  });
}
