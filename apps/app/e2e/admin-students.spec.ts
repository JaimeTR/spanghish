import { expect, test, type Page } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, SEED_IDS, USERS } from "./fixtures";

async function loginAdmin(page: Page) {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
}

const STUDENT_URL = /^\/es\/admin\/students\/[0-9a-f-]{36}$/;

test("admin registers a minor with a new guardian and the consent shows its text version and date", async ({
  page,
}) => {
  const suffix = `e2e-${Date.now()}`;
  const admin = adminClient();
  await loginAdmin(page);
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Alumnos" }).click();
  await expectPath(page, "/es/admin/students");
  await page.getByRole("link", { name: "Nuevo alumno" }).click();

  // Sin segmento "niños", el bloque del tutor no se ve.
  await expect(page.getByLabel("Nombre del tutor")).toBeHidden();
  await page.getByLabel("Nombre completo").fill(`Niña ${suffix}`);
  await page.getByLabel("Segmento").selectOption("kids");
  await expect(page.getByLabel("Nombre del tutor")).toBeVisible();
  // El texto del consentimiento vigente se muestra antes de la casilla.
  await expect(page.getByText(/Versión minor_data-v1, vigente desde/)).toBeVisible();
  await expect(page.getByText("TEXTO DE DESARROLLO", { exact: false })).toBeVisible();

  await page.getByLabel("Nombre del tutor").fill(`Tutora ${suffix}`);
  // Sin correo del tutor ni casilla: errores en los campos, se conserva lo escrito.
  await page.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByLabel("Correo del tutor")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Nombre completo")).toHaveValue(`Niña ${suffix}`);

  await page.getByLabel("Correo del tutor").fill(`${suffix}@example.com`);
  await page.getByLabel("El tutor ha dado su consentimiento a este texto").check();
  await page.getByRole("button", { name: "Dar de alta" }).click();

  await expect.poll(() => new URL(page.url()).pathname).toMatch(STUDENT_URL);
  const studentId = new URL(page.url()).pathname.split("/").pop()!;
  try {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Niña ${suffix}`);
    const guardians = page.getByRole("region", { name: "Tutores" });
    await expect(guardians).toContainText(`Tutora ${suffix} · Madre o padre`);
    const consents = page.getByRole("region", { name: "Consentimientos" });
    await expect(consents).toContainText("Datos del menor · Concedido");
    // Versión del texto y fecha (hoy, hora de Brisbane).
    const today = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Australia/Brisbane",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());
    await expect(consents).toContainText(`Texto minor_data-v1 · ${today}`);
    await expect(consents).toContainText(`Tutor: Tutora ${suffix}`);

    // Revocar añade un registro nuevo (el anterior se conserva).
    await consents.getByLabel("Decisión").selectOption("false");
    await consents.getByRole("button", { name: "Registrar" }).click();
    await expect(consents.getByText("Datos del menor · Revocado")).toBeVisible();
    await expect(consents.getByText("Datos del menor · Concedido")).toBeVisible();

    // Un menor no tiene acceso al portal.
    await expect(page.getByRole("region", { name: "Acceso al portal" })).toHaveCount(0);
  } finally {
    // Los consentimientos son append-only: la ficha no se puede borrar; se desactiva.
    await admin.from("students").update({ status: "inactive" }).eq("id", studentId);
  }
});

test("admin registers an adult and grants portal access", async ({ page }) => {
  const suffix = `e2e-${Date.now()}`;
  const email = `${suffix}-adult@spanglish.test`;
  const admin = adminClient();
  let studentId: string | null = null;
  try {
    await loginAdmin(page);
    await page.goto("/es/admin/students/new");
    await page.getByLabel("Nombre completo").fill(`Adulto ${suffix}`);
    await page.getByLabel("Segmento").selectOption("mature");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Teléfono", { exact: true }).fill("0400 123 456");
    await page.getByRole("button", { name: "Dar de alta" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(STUDENT_URL);
    studentId = new URL(page.url()).pathname.split("/").pop()!;

    await expect(page.getByLabel("Correo electrónico")).toHaveValue(email);
    const portal = page.getByRole("region", { name: "Acceso al portal" });
    await portal.getByRole("button", { name: "Dar acceso al portal" }).click();
    await expect(portal).toContainText("Este alumno ya tiene cuenta en el portal.");

    const { data } = await admin
      .from("students")
      .select("profile_id, profile:profiles!students_profile_id_fkey(email, user_roles(role))")
      .eq("id", studentId)
      .single();
    expect(data?.profile?.email).toBe(email);
    expect(data?.profile?.user_roles.map((r) => r.role)).toEqual(["student"]);
  } finally {
    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (studentId) await admin.from("students").delete().eq("id", studentId);
    if (profile) await admin.auth.admin.deleteUser(profile.id);
  }
});

test("search by name filters the list", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/es/admin/students");
  await page.getByLabel("Nombre").fill("Kid Local");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expectPath(page, "/es/admin/students?search=Kid+Local&audience=&status=");
  const results = page.getByRole("table");
  await expect(results.getByRole("link", { name: "Kid Local" })).toBeVisible();
  await expect(results.getByRole("link", { name: "Student Two" })).toHaveCount(0);

  await page.goto("/es/admin/students?audience=adults");
  await expect(page.getByRole("table").getByRole("link", { name: "Student Two" })).toBeVisible();
  await expect(page.getByRole("table").getByRole("link", { name: "Kid Local" })).toHaveCount(0);
});

test("a student id that does not exist returns 404", async ({ page }) => {
  await loginAdmin(page);
  const missing = await page.goto("/es/admin/students/00000000-0000-4000-8000-000000000000");
  expect(missing?.status()).toBe(404);
  const malformed = await page.goto("/es/admin/students/1'%20or%201=1");
  expect(malformed?.status()).toBe(404);
});

test("student pages and consent texts have no axe violations", async ({ page }) => {
  await loginAdmin(page);
  for (const path of [
    "/es/admin/students",
    "/es/admin/students/new",
    `/es/admin/students/${SEED_IDS.students.local}`,
    "/en/admin/settings/consent-texts",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
  }
});

test("admin publishes a new consent text version and it becomes current", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/es/admin/settings/consent-texts");
  const form = page.getByRole("region", { name: "Nueva versión" });
  await form.getByLabel("Tipo").selectOption("photos");
  await form.getByLabel("Texto (español)").fill("Autorizo fotos (texto e2e).");
  await form.getByLabel("Texto (inglés)").fill("I authorise photos (e2e text).");
  await form.getByRole("button", { name: "Publicar versión" }).click();
  await expect(form.getByRole("status")).toHaveText("Cambios guardados.");
  await expect(page.getByRole("region", { name: "Versiones" }).getByText(/^Fotos · photos-v\d+ · Vigente$/).first()).toBeVisible();
});

test("teacher and guardian cannot open the students admin", async ({ page }) => {
  await login(page, USERS.teacher2);
  await expectPath(page, "/es/teacher");
  await page.goto(`/es/admin/students/${SEED_IDS.students.local}`);
  await expectPath(page, "/es/teacher");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expectPath(page, "/es/login");
  await login(page, USERS.guardian);
  await expectPath(page, "/es/guardian");
  await page.goto("/es/admin/settings/consent-texts");
  await expectPath(page, "/es/guardian");
});
