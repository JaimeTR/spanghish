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

export type UserRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  roles: AppRole[];
};

const USER_COLUMNS = "id, full_name, email, phone, status, user_roles(role)";

function toUserRow(p: {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  user_roles: { role: AppRole }[];
}): UserRow {
  return {
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    status: p.status === "active" ? "active" : "suspended",
    roles: p.user_roles.map((r) => r.role),
  };
}

/** Todas las cuentas con sus roles (RLS: solo una admin ve todas). */
export async function listUsers(supabase: Client): Promise<UserRow[]> {
  const { data, error } = await supabase.from("profiles").select(USER_COLUMNS).order("full_name", { nullsFirst: false }).limit(1000);
  if (error) throw new Error(`listUsers: ${error.code}`);
  return data.map(toUserRow);
}

/** Solo las cuentas con rol docente. */
export async function listTeachers(supabase: Client): Promise<UserRow[]> {
  return (await listUsers(supabase)).filter((u) => u.roles.includes("teacher"));
}

/** Una cuenta con todos sus datos de perfil; null si no existe. */
export async function getUserDetail(supabase: Client, id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, birth_date, address, city, country, preferred_locale, status, created_at, user_roles(role)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getUserDetail: ${error.code}`);
  return data;
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

/** Fila de la lista de alumnos: la ficha con su nivel y su contacto (RLS: el contacto solo lo ve admin, alumno o tutor). */
export type StudentListRow = StudentRow & {
  student_private: Pick<Tables<"student_private">, "email" | "phone" | "birth_date"> | null;
  levels: Pick<Tables<"levels">, "code" | "name_es" | "name_en"> | null;
};

export async function listStudents(supabase: Client): Promise<StudentListRow[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*, student_private(email, phone, birth_date), levels(code, name_es, name_en)")
    .order("full_name")
    .limit(500);
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
