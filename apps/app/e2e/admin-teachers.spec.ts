import { expect, test } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, USERS, signOut } from "./fixtures";

const NEW_PASSWORD = "Docente-e2e-clave-2026";

test("admin invites a teacher who sets a password and lands on /es/teacher", async ({ page }) => {
  const suffix = `e2e-${Date.now()}`;
  const email = `${suffix}-teacher@spanglish.test`;
  const name = `Docente ${suffix}`;
  const admin = adminClient();
  try {
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Docentes" }).click();
    await expectPath(page, "/es/admin/teachers");
    await page.getByRole("button", { name: "Invitar docente" }).click();
    await expect(page.getByRole("dialog", { name: "Invitar docente" })).toBeVisible();

    await page.getByLabel("Nombre completo").fill(name);
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("button", { name: "Enviar invitación" }).click();

    await expect.poll(() => new URL(page.url()).pathname).toBe("/es/admin/teachers");
    await expect(page.getByRole("status").filter({ hasText: /Invitación enviada|Cuenta creada/ })).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("Docente");

    // La cuenta nace solo con rol teacher (app_metadata.initial_role).
    const { data: profile } = await admin
      .from("profiles")
      .select("id, user_roles(role)")
      .eq("email", email)
      .single();
    expect(profile?.user_roles.map((r) => r.role)).toEqual(["teacher"]);

    // La docente elige contraseña con el enlace de recuperación.
    const link = await admin.auth.admin.generateLink({ type: "recovery", email });
    expect(link.error).toBeNull();
    await signOut(page);
    await expectPath(page, "/es/login");
    await page.goto(`/es/reset-password?token_hash=${link.data.properties!.hashed_token}&type=recovery`);
    await page.getByLabel("Contraseña nueva").fill(NEW_PASSWORD);
    await page.getByLabel("Repite la contraseña").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expectPath(page, "/es/teacher");
  } finally {
    const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (data) await admin.auth.admin.deleteUser(data.id);
  }
});

test("an invalid email keeps what was typed and marks the field", async ({ page }) => {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  await page.goto("/es/admin/teachers/new");
  await page.getByLabel("Nombre completo").fill("Nombre conservado");
  await page.getByLabel("Correo electrónico").fill("no-es-un-correo");
  await page.getByRole("button", { name: "Enviar invitación" }).click();
  const email = page.getByLabel("Correo electrónico");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription(/Escribe un correo electrónico válido/);
  await expect(page.getByLabel("Nombre completo")).toHaveValue("Nombre conservado");
  await expectPath(page, "/es/admin/teachers?new=1");
});

test("suspending the only admin shows the last-admin message", async ({ page }) => {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  await page.goto("/es/admin/teachers");
  const row = page.getByRole("row", { name: /Admin Local/ });
  await row.getByRole("button", { name: /Suspender/ }).click();
  await expect(row.getByRole("alert")).toHaveText("No puedes quitar a la última administradora activa.");
  await expect(row).toContainText("Activa");
});

test("admin suspends and reactivates a teacher", async ({ page }) => {
  const admin = adminClient();
  const email = `e2e-${Date.now()}-suspend@spanglish.test`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { initial_role: "teacher" },
    user_metadata: { full_name: `Suspendible ${email}` },
  });
  expect(created.error).toBeNull();
  try {
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    await page.goto("/es/admin/teachers");
    const row = page.getByRole("row", { name: new RegExp(`Suspendible ${email}`) });
    await row.getByRole("button", { name: /Suspender/ }).click();
    await expect(row).toContainText("Suspendida");
    await row.getByRole("button", { name: /Reactivar/ }).click();
    await expect(row).toContainText("Activa");
  } finally {
    await admin.auth.admin.deleteUser(created.data.user!.id);
  }
});

test("teacher cannot open /es/admin/teachers", async ({ page }) => {
  await login(page, USERS.teacher2);
  await expectPath(page, "/es/teacher");
  await page.goto("/es/admin/teachers");
  await expectPath(page, "/es/teacher");
  await page.goto("/es/admin/teachers/new");
  await expectPath(page, "/es/teacher");
});

test("teachers pages have no axe violations", async ({ page }) => {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  await page.goto("/es/admin/teachers");
  await expectNoAxeViolations(page);
  await page.goto("/en/admin/teachers/new");
  await expect(page.getByRole("dialog", { name: "Invite a teacher" })).toBeVisible();
  await expectNoAxeViolations(page);
});
