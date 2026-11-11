import { expect, test } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, SEED_IDS, signOut, USERS } from "./fixtures";

/**
 * Packs de clases: una matrícula "pack" con precio de pack crea su pack; la docente marca presente y
 * se descuenta una clase; el alumno ve las clases disponibles y la administración ajusta el saldo.
 */
test("a pack enrolment creates a lesson pack that attendance draws down and the admin can adjust", async ({ page }) => {
  const admin = adminClient();
  const code = `E2E-PACK-${Date.now().toString(36).toUpperCase()}`;
  const { data: teacher } = await admin.from("profiles").select("id").eq("email", USERS.teacher).single();
  const price = await admin.from("program_prices").insert({ program_id: SEED_IDS.program, kind: "pack", amount_cents: 15000, lessons_included: 3 }).select("id").single();
  expect(price.error).toBeNull();
  const group = await admin
    .from("groups")
    .insert({ code, name: `Grupo ${code}`, program_id: SEED_IDS.program, teacher_id: teacher!.id, format: "local_group", capacity: 5, status: "active" })
    .select("id")
    .single();
  expect(group.error).toBeNull();
  const groupId = group.data!.id;

  try {
    const enrolled = await admin.from("enrollments").insert({ student_id: SEED_IDS.students.local, group_id: groupId, billing_mode: "pack", price_id: price.data!.id, agreed_amount_cents: 15000, status: "active" });
    expect(enrolled.error).toBeNull();
    const start = new Date(Date.now() - 10 * 60_000);
    const session = await admin.from("sessions").insert({ group_id: groupId, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 70 * 60_000).toISOString(), teacher_id: teacher!.id });
    expect(session.error).toBeNull();

    // Docente: marca presente (descuenta una clase).
    await login(page, USERS.teacher);
    await expectPath(page, "/es/teacher");
    await page.goto("/es/teacher/today");
    const card = page.getByRole("region", { name: `Grupo ${code}` });
    await card.getByRole("button", { name: "Presente", exact: true }).click();
    await expect(card.getByRole("button", { name: "Presente", exact: true })).toHaveAttribute("aria-pressed", "true");
    await signOut(page);

    // Alumno: ve sus clases disponibles.
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    await page.goto("/es/student/courses");
    await expect(page.getByText("Clases disponibles")).toBeVisible();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    await expectNoAxeViolations(page);
    await signOut(page);

    // Administración: ve el pack y el movimiento, y ajusta el saldo.
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    await page.goto(`/es/admin/students/${SEED_IDS.students.local}`);
    const packs = page.getByRole("region", { name: "Packs de clases" });
    await expect(packs.getByText("2 de 3 clases").first()).toBeVisible();
    await expect(packs.getByText(/Asistencia/).first()).toBeVisible();
    await expectNoAxeViolations(page);
    await packs.getByRole("button", { name: "Ajustar saldo" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Cambio de clases").fill("2");
    await dialog.getByLabel("Motivo").fill("Clase de cortesía");
    await dialog.getByRole("button", { name: "Guardar ajuste" }).click();
    await expect(dialog.getByText("Cambios guardados.")).toBeVisible();
    await dialog.getByRole("button", { name: "Cerrar" }).click();
    await expect(dialog).toBeHidden();
    await expect(packs.getByText("4 de 3 clases").first()).toBeVisible();
  } finally {
    const packs = (await admin.from("credit_packs").select("id").eq("enrollment_id", (await admin.from("enrollments").select("id").eq("group_id", groupId).maybeSingle()).data?.id ?? "")).data ?? [];
    for (const p of packs) await admin.from("credit_packs").update({ voided_at: new Date().toISOString(), voided_reason: "e2e" }).eq("id", p.id);
    const sessions = (await admin.from("sessions").select("id").eq("group_id", groupId)).data ?? [];
    await admin.from("attendance").delete().in("session_id", sessions.map((s) => s.id));
    await admin.from("enrollments").delete().eq("group_id", groupId);
    await admin.from("groups").delete().eq("id", groupId);
    await admin.from("program_prices").delete().eq("id", price.data!.id);
  }
});

/** Cierres: un festivo cancela la clase futura de ese día y el calendario lo muestra. */
test("a closure cancels the class that falls on it and the calendar shows it", async ({ page }) => {
  const admin = adminClient();
  const code = `E2E-CLS-${Date.now().toString(36).toUpperCase()}`;
  const reason = `Festivo ${code}`;
  const { data: teacher } = await admin.from("profiles").select("id").eq("email", USERS.teacher).single();
  const group = await admin
    .from("groups")
    .insert({ code, name: `Grupo ${code}`, program_id: SEED_IDS.program, teacher_id: teacher!.id, format: "local_group", capacity: 5, status: "active" })
    .select("id")
    .single();
  expect(group.error).toBeNull();
  const groupId = group.data!.id;
  try {
    const start = new Date(Date.now() + 12 * 24 * 3600_000);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Brisbane" }).format(start);
    const session = await admin.from("sessions").insert({ group_id: groupId, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 70 * 60_000).toISOString(), teacher_id: teacher!.id });
    expect(session.error).toBeNull();

    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    await page.goto(`/es/admin/calendar?week=${day}`);
    await expect(page.getByText(`Grupo ${code}`)).toBeVisible();
    await page.getByRole("button", { name: "Cierres" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Desde").fill(day);
    await dialog.getByLabel("Motivo (español)").fill(reason);
    await dialog.getByRole("button", { name: "Agregar cierre" }).click();
    await expect(dialog.getByText("Cambios guardados.")).toBeVisible();
    await expect(dialog.getByText(reason).first()).toBeVisible();
    await dialog.getByRole("button", { name: "Cerrar" }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText(new RegExp(`Cierre: ${reason}`)).first()).toBeVisible();
    const row = page.getByRole("listitem").filter({ hasText: `Grupo ${code}` });
    await expect(row.getByText("Cancelada")).toBeVisible();
    await expectNoAxeViolations(page);
  } finally {
    await admin.from("closures").delete().eq("reason_es", reason);
    await admin.from("groups").delete().eq("id", groupId);
  }
});
