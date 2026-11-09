import "server-only";
import type { Database } from "@spanglish/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole, UserStatus } from "../access";

type Client = SupabaseClient<Database>;

export type StaffMember = {
  id: string;
  fullName: string | null;
  email: string | null;
  roles: AppRole[];
  status: UserStatus;
};

const STAFF_ROLES: AppRole[] = ["admin", "teacher"];

/** Cuentas con rol admin o teacher (RLS: solo una admin ve todas). */
export async function listStaff(supabase: Client): Promise<StaffMember[]> {
  const staffRoles = await supabase.from("user_roles").select("user_id").in("role", STAFF_ROLES);
  if (staffRoles.error) throw new Error(`listStaff: ${staffRoles.error.code}`);
  const ids = [...new Set(staffRoles.data.map((r) => r.user_id))];
  if (ids.length === 0) return [];

  const profiles = await supabase
    .from("profiles")
    .select("id, full_name, email, status, user_roles(role)")
    .in("id", ids)
    .order("full_name", { nullsFirst: false });
  if (profiles.error) throw new Error(`listStaff: ${profiles.error.code}`);

  return profiles.data.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    roles: p.user_roles.map((r) => r.role),
    status: p.status === "active" ? "active" : "suspended",
  }));
}
