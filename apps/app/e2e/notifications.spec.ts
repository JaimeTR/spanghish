import { expect, test } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, signOut, USERS } from "./fixtures";

/** Avisos: la campana cuenta lo no leído, la página los lista y se pueden marcar como leídos. */
test("the bell counts unread notices and the page marks them as read", async ({ page }) => {
  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("email", USERS.student).single();
  const tag = `e2e-${Date.now().toString(36)}`;
  const inserted = await admin.from("notifications").insert([
    { user_id: profile!.id, kind: "class_reminder", title_es: `Clase mañana ${tag}`, title_en: `Class tomorrow ${tag}`, body_es: "Prueba", body_en: "Test", link: "student/schedule", dedupe_key: tag },
  ]);
  expect(inserted.error).toBeNull();
  try {
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    await expect(page.getByRole("link", { name: /Avisos, \d+ sin leer/ })).toBeVisible();
    await page.getByRole("link", { name: /Avisos, \d+ sin leer/ }).click();
    await expectPath(page, "/es/account/notifications");
    await expect(page.getByText(`Clase mañana ${tag}`)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Marcar todo como leído" }).click();
    await expect(page.getByRole("button", { name: "Marcar todo como leído" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Avisos", exact: true })).toBeVisible();
    await signOut(page);
  } finally {
    await admin.from("notifications").delete().eq("dedupe_key", tag);
  }
});
