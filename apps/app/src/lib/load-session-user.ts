import type { Database } from "@spanglish/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toSessionUser, type SessionUser } from "./access";

/**
 * Lee el usuario autenticado y su acceso con el cliente dado (proxy o servidor).
 * - getUser() valida el JWT contra Auth (getSession no sirve para autorizar).
 * - Un suspendido no puede leer ni su perfil (RLS exige is_active()), así que el
 *   estado se pregunta con account_status() (0005): 'suspended' => sin roles;
 *   NULL => "no_profile" (sin roles; el proxy y el login cierran la sesión con
 *   el mensaje genérico, no con el de suspensión).
 * - Ante errores de la base de datos devuelve null (sin acceso), sin marcar
 *   ningún estado, para no cerrar sesiones por fallos transitorios.
 */
export async function loadSessionUser(
  supabase: SupabaseClient<Database>,
): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const id = data.user.id;

  const status = await supabase.rpc("account_status");
  if (status.error) return null;
  if (status.data === null) return { id, roles: [], status: "no_profile", locale: "es" };
  if (status.data !== "active") return { id, roles: [], status: "suspended", locale: "es" };

  const [profile, roles] = await Promise.all([
    supabase.from("profiles").select("id, status, preferred_locale, full_name, email").eq("id", id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", id),
  ]);
  if (profile.error || roles.error || !profile.data) return null;
  return toSessionUser(profile.data, roles.data ?? []);
}
