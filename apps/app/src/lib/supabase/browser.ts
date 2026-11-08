import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Next.js solo inlina NEXT_PUBLIC_* con acceso literal.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (ver .env.example).",
    );
  }
  return createBrowserClient(url, anonKey);
}
