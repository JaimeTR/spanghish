import type { Database } from "@spanglish/db";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { DEV_PASSWORD, SEED_IDS, USERS } from "./fixtures";

/**
 * Aislamiento por RLS a través de la API real (PostgREST con el JWT de cada
 * persona del seed), no solo en pgTAP: lo que vería un navegador manipulado.
 */
async function signedIn(email: string) {
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({ email, password: DEV_PASSWORD });
  expect(error).toBeNull();
  return client;
}

test("a teacher reads no students, private data, guardians or consents through the API", async () => {
  const teacher = await signedIn(USERS.teacher2);
  for (const table of [
    "students",
    "student_private",
    "student_admin_notes",
    "guardians",
    "student_guardians",
    "consents",
  ] as const) {
    const { data, error } = await teacher.from(table).select("id");
    expect(error, table).toBeNull();
    expect(data, table).toEqual([]);
  }
  const { error } = await teacher.rpc("create_student", { p_payload: { full_name: "X", audience: "adults" } });
  expect(error?.code).toBe("42501");
  // El catálogo sí es legible.
  const { data: programs } = await teacher.from("programs").select("id").eq("id", SEED_IDS.program);
  expect(programs).toHaveLength(1);
});

test("a guardian reads only their minor, and a student only themself", async () => {
  const guardian = await signedIn(USERS.guardian);
  const { data: kids } = await guardian.from("students").select("full_name");
  expect(kids?.map((s) => s.full_name)).toEqual(["Kid Local"]);
  const { data: guardians } = await guardian.from("guardians").select("id");
  expect(guardians?.map((g) => g.id)).toEqual([SEED_IDS.guardian]);
  const { data: consents } = await guardian.from("consents").select("text_id");
  expect(consents?.map((c) => c.text_id)).toEqual([SEED_IDS.consentText]);
  // Las notas internas de su menor no le llegan (solo administración).
  const { data: guardianNotes, error: guardianNotesError } = await guardian.from("student_admin_notes").select("notes");
  expect(guardianNotesError).toBeNull();
  expect(guardianNotes).toEqual([]);
  // Ni la ficha de otro alumno por id.
  const { data: other } = await guardian.from("student_private").select("id").eq("student_id", SEED_IDS.students.two);
  expect(other).toEqual([]);

  const student = await signedIn(USERS.student);
  const { data: own } = await student.from("students").select("id");
  expect(own?.map((s) => s.id)).toEqual([SEED_IDS.students.local]);
  const { data: privateRows } = await student.from("student_private").select("student_id");
  expect(privateRows?.map((p) => p.student_id)).toEqual([SEED_IDS.students.local]);
  const { data: ownNotes } = await student.from("student_admin_notes").select("notes");
  expect(ownNotes).toEqual([]);
  // Escribir está reservado a la administración.
  const { data: updated } = await student
    .from("students")
    .update({ full_name: "Hacked" })
    .eq("id", SEED_IDS.students.local)
    .select("id");
  expect(updated).toEqual([]);
});

test("the admin reads the seeded internal notes through the API", async () => {
  const admin = await signedIn(USERS.admin);
  const { data } = await admin.from("student_admin_notes").select("student_id");
  expect(data?.map((n) => n.student_id)).toContain(SEED_IDS.students.local);
  expect(data?.length).toBeGreaterThanOrEqual(2);
});
