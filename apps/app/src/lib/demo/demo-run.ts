import type { Database } from "@spanglish/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_ID, type buildDemoContent, type DemoUser } from "./demo-data";

/**
 * Escritura de los datos de demostración. Recibe un cliente de servicio ya
 * creado: quien llama (scripts/demo-seed.ts) es responsable de haber
 * comprobado el destino con assertDemoTarget. Nunca imprime ni devuelve
 * contraseñas o claves.
 */

type Client = SupabaseClient<Database>;
type Content = ReturnType<typeof buildDemoContent>;

/** Ficha de alumna de la cuenta student.demo. */
export const DEMO_STUDENT_ID = DEMO_ID(61);
/** Imágenes públicas que sube el script (miniatura de un recurso e imagen de un bloque). */
export const demoMediaPaths = (content: Content): string[] => [
  ...content.resources.flatMap((row) => (row.thumbnail_path ? [row.thumbnail_path] : [])),
  ...content.blocks.flatMap((row) => (row.image_path ? [row.image_path] : [])),
];

function check(step: string, error: { message: string } | null): void {
  if (error) throw new Error(`${step}: ${error.message}`);
}

/** Lo que haría el script, sin escribir nada (para --dry-run). Sin contraseñas. */
export function describePlan(command: "seed" | "remove", users: DemoUser[], content: Content): string[] {
  const verb = command === "seed" ? "Crear o actualizar" : "Borrar";
  return [
    `${verb} ${users.length} cuentas: ${users.map((user) => user.email).join(", ")}`,
    `${verb} ${content.resources.length} recursos: ${content.resources.map((row) => `${row.title_es} (${row.access_level})`).join("; ")}`,
    `${verb} ${content.lessons.length} lecciones: ${content.lessons.map((row) => `${row.title_es} (${row.access_level})`).join("; ")}`,
    `${verb} ${content.blocks.length} bloques, ${content.files.length} archivos y ${demoMediaPaths(content).length} imágenes`,
    `${verb} ${content.locations.length} sedes y ${content.programs.length} programa`,
    `${verb} la ficha de alumna ${DEMO_STUDENT_ID}`,
  ];
}

async function findUsers(client: Client, emails: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    check("listar cuentas", error);
    for (const user of data.users) if (user.email && emails.includes(user.email)) found.set(user.email, user.id);
    if (data.users.length < 1000) return found;
  }
}

export async function seedDemo(client: Client, users: DemoUser[], content: Content, image: Uint8Array): Promise<string[]> {
  // Niveles reales del proyecto (los ids de nivel de buildDemoContent son marcadores).
  const { data: levels, error: levelsError } = await client.from("levels").select("id, code").eq("language_code", "es").in("code", ["A1", "B1"]);
  check("leer niveles", levelsError);
  const level = new Map((levels ?? []).map((row) => [row.code, row.id]));
  const a1 = level.get("A1");
  const b1 = level.get("B1");
  if (!a1 || !b1) throw new Error("No existen los niveles A1 y B1 de español: ¿se subieron las migraciones?");
  const lessons = content.lessons.map((row) => ({ ...row, level_id: row.level_id === DEMO_ID(201) ? a1 : row.level_id === DEMO_ID(203) ? b1 : row.level_id }));
  const programs = content.programs.map((row) => ({ ...row, level_id: row.level_id === DEMO_ID(201) ? a1 : row.level_id }));

  // Cuentas. El rol inicial lo asigna la base al crear la cuenta; "admin" nunca es rol inicial.
  const existing = await findUsers(client, users.map((user) => user.email));
  for (const user of users) {
    const id = existing.get(user.email);
    const result = id
      ? await client.auth.admin.updateUserById(id, { password: user.password, user_metadata: { full_name: user.fullName } })
      : await client.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          app_metadata: { initial_role: user.initialRole },
          user_metadata: { full_name: user.fullName },
        });
    check(`cuenta ${user.key}`, result.error);
    const userId = result.data.user!.id;
    if (user.extraRoles.includes("admin")) {
      check("rol admin", (await client.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" })).error);
      check("quitar rol inicial de la admin", (await client.from("user_roles").delete().eq("user_id", userId).eq("role", user.initialRole)).error);
    }
    if (user.studentRow) {
      const student = { id: DEMO_STUDENT_ID, profile_id: userId, full_name: "DEMO · Alumna", audience: "adults" as const, level_id: a1, status: "active" as const };
      check("ficha de alumna", (await client.from("students").upsert(student, { onConflict: "id" })).error);
      // Sin email ni teléfono: la demo no guarda datos de contacto.
      check("contacto de alumna", (await client.from("student_private").upsert({ student_id: DEMO_STUDENT_ID }, { onConflict: "student_id" })).error);
    }
  }

  check("sedes", (await client.from("locations").upsert(content.locations, { onConflict: "id" })).error);
  check("programa", (await client.from("programs").upsert(programs, { onConflict: "id" })).error);

  // Archivos antes que las filas que los referencian.
  for (const file of content.files) {
    const { error } = await client.storage.from("resource-files").upload(file.path, file.bytes, { upsert: true, contentType: file.mime });
    check(`archivo ${file.path}`, error);
  }
  for (const mediaPath of demoMediaPaths(content)) {
    const { error } = await client.storage.from("content-media").upload(mediaPath, image, { upsert: true, contentType: "image/png" });
    check(`imagen ${mediaPath}`, error);
  }
  check("recursos", (await client.from("resources").upsert(content.resources, { onConflict: "id" })).error);

  // Una lección artículo solo se puede publicar cuando ya tiene bloques:
  // primero en borrador, luego los bloques, y al final se publica.
  check("lecciones", (await client.from("lessons").upsert(lessons.map((row) => ({ ...row, status: "draft" as const })), { onConflict: "id" })).error);
  check("bloques", (await client.from("lesson_blocks").upsert(content.blocks, { onConflict: "id" })).error);
  const toPublish = lessons.filter((row) => row.status === "published").map((row) => row.id!);
  check("publicar lecciones", (await client.from("lessons").update({ status: "published" }).in("id", toPublish)).error);

  return [
    `${users.length} cuentas: ${users.map((user) => user.email).join(", ")}`,
    `${content.resources.length} recursos, ${content.lessons.length} lecciones (${content.blocks.length} bloques), ${content.locations.length} sedes y ${content.programs.length} programa`,
  ];
}

/** Borra exactamente lo que crea seedDemo: los ids DEMO y las cuatro cuentas. */
export async function removeDemo(client: Client, users: DemoUser[], content: Content): Promise<string[]> {
  // Borrar la lección borra sus bloques en cascada (borrarlos antes lo impide la base si está publicada).
  check("lecciones", (await client.from("lessons").delete().in("id", content.lessons.map((row) => row.id!))).error);
  check("recursos", (await client.from("resources").delete().in("id", content.resources.map((row) => row.id!))).error);
  check("archivos", (await client.storage.from("resource-files").remove(content.files.map((file) => file.path))).error);
  check("imágenes", (await client.storage.from("content-media").remove(demoMediaPaths(content))).error);
  check("programa", (await client.from("programs").delete().in("id", content.programs.map((row) => row.id!))).error);
  check("sedes", (await client.from("locations").delete().in("id", content.locations.map((row) => row.id!))).error);
  check("ficha de alumna", (await client.from("students").delete().eq("id", DEMO_STUDENT_ID)).error);

  const found = await findUsers(client, users.map((user) => user.email));
  for (const [email, id] of found) check(`cuenta ${email}`, (await client.auth.admin.deleteUser(id)).error);
  return [`${found.size} cuentas borradas`, "contenido, archivos, sedes, programa y ficha de demo borrados"];
}
