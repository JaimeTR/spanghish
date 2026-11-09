import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { adminClient, expectPath, login, signOut } from "./fixtures";

const NEW_PASSWORD = "Nueva-clave-e2e-2026";

/** Usuario nuevo (solo local) y su token de recuperación (hashed_token). */
async function userWithRecoveryToken(initialRole?: "teacher" | "student" | "guardian") {
  const admin = adminClient();
  const email = `e2e-reset-${Date.now()}@spanglish.test`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    ...(initialRole ? { app_metadata: { initial_role: initialRole } } : {}),
  });
  expect(created.error).toBeNull();
  const userId = created.data.user!.id;
  const link = await admin.auth.admin.generateLink({ type: "recovery", email });
  expect(link.error).toBeNull();
  const tokenHash = link.data.properties!.hashed_token;
  return {
    email,
    tokenHash,
    cleanup: async () => {
      const { error } = await admin.auth.admin.deleteUser(userId);
      expect(error).toBeNull();
    },
  };
}

test("reset-password with a recovery token sets a new password and lands in the role area", async ({
  page,
}) => {
  const { email, tokenHash, cleanup } = await userWithRecoveryToken("teacher");
  try {
    await page.goto(`/es/reset-password?token_hash=${tokenHash}&type=recovery`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Crear una contraseña nueva");
    await page.getByLabel("Contraseña nueva").fill(NEW_PASSWORD);
    await page.getByLabel("Repite la contraseña").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expectPath(page, "/es/teacher");

    // La contraseña nueva sirve para entrar.
    await signOut(page);
    await expectPath(page, "/es/login");
    await login(page, email, { password: NEW_PASSWORD });
    await expectPath(page, "/es/teacher");
  } finally {
    await cleanup();
  }
});

test("a mismatched confirmation keeps the link usable", async ({ page }) => {
  const { tokenHash, cleanup } = await userWithRecoveryToken();
  try {
    await page.goto(`/es/reset-password?token_hash=${tokenHash}&type=recovery`);
    await page.getByLabel("Contraseña nueva").fill(NEW_PASSWORD);
    await page.getByLabel("Repite la contraseña").fill(`${NEW_PASSWORD}-x`);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(page.locator('#reset-error[role="alert"]')).toHaveText(
      "Las dos contraseñas no coinciden.",
    );
    await expect(page.getByLabel("Repite la contraseña")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Contraseña nueva").fill(NEW_PASSWORD);
    await page.getByLabel("Repite la contraseña").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expectPath(page, "/es/student");
  } finally {
    await cleanup();
  }
});

test("an expired or reused token shows the expired message", async ({ page }) => {
  const { tokenHash, cleanup } = await userWithRecoveryToken();
  try {
    // Se gasta el token fuera del formulario.
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const used = await anon.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    expect(used.error).toBeNull();

    await page.goto(`/es/reset-password?token_hash=${tokenHash}&type=recovery`);
    await page.getByLabel("Contraseña nueva").fill(NEW_PASSWORD);
    await page.getByLabel("Repite la contraseña").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(page.locator('#reset-error[role="alert"]')).toHaveText(
      "Este enlace ha caducado o ya se usó. Pide uno nuevo.",
    );
    await expect(page.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute(
      "href",
      "/es/forgot-password",
    );
    await expectPath(page, `/es/reset-password?token_hash=${tokenHash}&type=recovery`);
  } finally {
    await cleanup();
  }

  // Sin token: mismo mensaje, sin formulario.
  await page.goto("/es/reset-password");
  await expect(page.getByText("Este enlace ha caducado o ya se usó. Pide uno nuevo.")).toBeVisible();
  await expect(page.getByLabel("Contraseña nueva")).toHaveCount(0);
});

test("/en/reset-password renders English text", async ({ page }) => {
  await page.goto("/en/reset-password?token_hash=0123456789abcdef&type=recovery");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create a new password");
  await expect(page.getByLabel("New password")).toBeVisible();
  await expect(page.getByLabel("Repeat the password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save password" })).toBeVisible();
});
