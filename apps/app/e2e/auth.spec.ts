import { expect, test } from "@playwright/test";
import {
  adminClient,
  DEV_PASSWORD,
  expectPath,
  login,
  loginError,
  USERS,
} from "./fixtures";

test("admin logs in and lands on /es/admin", async ({ page }) => {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Administración");
});

test("student visiting /es/admin is redirected to /es/student", async ({ page }) => {
  await login(page, USERS.student);
  await expectPath(page, "/es/student");
  await page.goto("/es/admin");
  await expectPath(page, "/es/student");
});

test("teacher with student role lands on /es/teacher", async ({ page }) => {
  await login(page, USERS.teacher);
  await expectPath(page, "/es/teacher");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Docente");
});

test("suspended user is sent to /es/login?error=suspended", async ({ page }) => {
  await login(page, USERS.suspended);
  await expectPath(page, "/es/login?error=suspended");
  await expect(loginError(page)).toContainText("suspendida");
  // Sin sesión: la zona privada vuelve a pedir login.
  await page.goto("/es/student");
  await expectPath(page, "/es/login?next=%2Fes%2Fstudent");
});

test("wrong password shows a generic error", async ({ page }) => {
  await login(page, USERS.admin, { password: "incorrecta" });
  await expect(loginError(page)).toHaveText("Correo o contraseña incorrectos.");
  await login(page, "nadie@spanglish.test", { password: "incorrecta" });
  await expect(loginError(page)).toHaveText("Correo o contraseña incorrectos.");
});

test("login with next=//evil.com ignores it", async ({ page }) => {
  await login(page, USERS.admin, { next: "//evil.com" });
  await expectPath(page, "/es/admin");
});

test("login honours a safe next the user can access", async ({ page }) => {
  await login(page, USERS.admin, { next: "/es/teacher" });
  await expectPath(page, "/es/teacher");
});

test("forgot-password shows the same message for unknown email", async ({ page }) => {
  const submit = async (email: string) => {
    await page.goto("/es/forgot-password");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    const status = page.getByRole("status");
    await expect(status).not.toBeEmpty();
    return status.innerText();
  };
  const known = await submit(USERS.student);
  const unknown = await submit("nadie@spanglish.test");
  expect(unknown).toBe(known);
});

test("/en/login renders English text", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot your password?" })).toBeVisible();
});

test("unknown locale /fr/admin redirects to /es", async ({ page }) => {
  await page.goto("/fr/admin");
  await expectPath(page, "/es/login?next=%2Fes%2Fadmin");
});

test("unauthenticated /es/admin redirects to /es/login?next=%2Fes%2Fadmin", async ({ page }) => {
  await page.goto("/es/admin");
  await expectPath(page, "/es/login?next=%2Fes%2Fadmin");
});

test("percent-encoded /es/%61dmin does not let a student in", async ({ page }) => {
  await login(page, USERS.student);
  await expectPath(page, "/es/student");
  await page.goto("/es/%61dmin");
  await expectPath(page, "/es/student");
  await expect(page.getByRole("heading", { name: "Administración" })).toHaveCount(0);
});

test("a suspended user with an already open session loses access on the next request", async ({
  page,
}) => {
  const admin = adminClient();
  const email = `e2e-${Date.now()}@spanglish.test`;
  const created = await admin.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  });
  expect(created.error).toBeNull();
  const userId = created.data.user!.id;
  try {
    await login(page, email);
    await expectPath(page, "/es/student");

    // service_role puede cambiar el estado desde 0004.
    const { data, error } = await admin
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", userId)
      .select("status");
    expect(error).toBeNull();
    expect(data).toEqual([{ status: "suspended" }]);

    await page.reload();
    await expectPath(page, "/es/login?error=suspended");
    await page.goto("/es/student");
    await expectPath(page, "/es/login?next=%2Fes%2Fstudent");
  } finally {
    const { error } = await admin.auth.admin.deleteUser(userId);
    expect(error).toBeNull();
  }
});

test("logout clears the session", async ({ page }) => {
  await login(page, USERS.student);
  await expectPath(page, "/es/student");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expectPath(page, "/es/login");
  await page.goto("/es/student");
  await expectPath(page, "/es/login?next=%2Fes%2Fstudent");
});
