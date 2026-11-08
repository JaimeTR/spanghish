import type { SupabaseClient } from "@supabase/supabase-js";
import { toSessionUser, type SessionUser } from "./access";

/**
 * Lee el usuario autenticado y su acceso con el cliente dado (proxy o servidor).
 * - getUser() valida el JWT contra Auth (getSession no sirve para autorizar).
 * - Un usuario suspendido no puede leer ni su perfil (RLS exige is_active()),
 *   así que el estado se pregunta con is_active(): false => suspendido, sin roles.
 *   Un usuario sin perfil también da false: se trata igual (falla cerrado).
 * - Ante errores de la base de datos devuelve null (sin acceso), sin marcar
 *   suspendido, para no cerrar sesiones por fallos transitorios.
 */
export async function loadSessionUser(supabase: SupabaseClient): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const id = data.user.id;

  const active = await supabase.rpc("is_active");
  if (active.error) return null;
  if (active.data !== true) {
    return { id, roles: [], status: "suspended", locale: "es" };
  }

  const [profile, roles] = await Promise.all([
    supabase.from("profiles").select("id, status, preferred_locale").eq("id", id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", id),
  ]);
  if (profile.error || roles.error || !profile.data) return null;
  return toSessionUser(profile.data, roles.data ?? []);
}
