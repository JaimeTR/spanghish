import "server-only";
import { toSessionUser, type SessionUser } from "./access";
import { createClient } from "./supabase/server";

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  // getUser valida el JWT contra Auth; getSession no sirve para autorizar.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const [profile, roles] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, status, preferred_locale")
      .eq("id", data.user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
  ]);
  if (!profile.data) return null;
  return toSessionUser(profile.data, roles.data ?? []);
}
