import "server-only";
import type { Database, Enums, Tables } from "@spanglish/db";
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

// ---------------------------------------------------------------------------
// Alumnos, tutores y consentimientos (lecturas con el JWT del usuario: RLS
// decide; las páginas de administración las llaman tras requireArea("admin")).
// ---------------------------------------------------------------------------
export type StudentRow = Tables<"students">;
export type AudienceSegment = Enums<"audience_segment">;
export type StudentStatus = Enums<"student_status">;
export type ConsentTextRow = Tables<"consent_texts">;
export type GuardianRow = Tables<"guardians">;

export type StudentDetail = StudentRow & {
  student_private: Tables<"student_private"> | null;
  /** Solo admin (RLS): para cualquier otra persona llega null. */
  student_admin_notes: Pick<Tables<"student_admin_notes">, "notes" | "updated_at"> | null;
  student_guardians: (Tables<"student_guardians"> & { guardians: GuardianRow | null })[];
  consents: Tables<"consents">[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Quita los comodines y separadores de PostgREST de una búsqueda libre. */
export function sanitizeSearch(search: string): string {
  return search.replace(/[%_,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listStudents(
  supabase: Client,
  q: { search?: string; audience?: AudienceSegment; status?: StudentStatus } = {},
): Promise<StudentRow[]> {
  let query = supabase.from("students").select("*");
  const search = q.search ? sanitizeSearch(q.search) : "";
  if (search) query = query.ilike("full_name", `%${search}%`);
  if (q.audience) query = query.eq("audience", q.audience);
  if (q.status) query = query.eq("status", q.status);
  const { data, error } = await query.order("full_name").limit(500);
  if (error) throw new Error(`listStudents: ${error.code}`);
  return data;
}

/** Ficha completa; null si no existe o RLS no deja verla (la página da 404). */
export async function getStudentDetail(supabase: Client, id: string): Promise<StudentDetail | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabase
    .from("students")
    .select("*, student_private(*), student_admin_notes(notes, updated_at), student_guardians(*, guardians(*)), consents(*)")
    .eq("id", id)
    .order("recorded_at", { referencedTable: "consents", ascending: false })
    .maybeSingle();
  if (error) throw new Error(`getStudentDetail: ${error.code}`);
  return data;
}

export async function listGuardians(supabase: Client): Promise<GuardianRow[]> {
  const { data, error } = await supabase.from("guardians").select("*").order("full_name").limit(500);
  if (error) throw new Error(`listGuardians: ${error.code}`);
  return data;
}

export async function listConsentTexts(supabase: Client): Promise<ConsentTextRow[]> {
  const { data, error } = await supabase
    .from("consent_texts")
    .select("*")
    .order("kind")
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listConsentTexts: ${error.code}`);
  return data;
}

/** Versión vigente de un tipo: la más reciente con effective_from <= hoy (día de Brisbane). */
export function currentConsentText(
  texts: ConsentTextRow[],
  kind: Enums<"consent_kind">,
  today: string,
): ConsentTextRow | null {
  return (
    texts
      .filter((t) => t.kind === kind && t.effective_from <= today)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.created_at.localeCompare(a.created_at))[0] ??
    null
  );
}
