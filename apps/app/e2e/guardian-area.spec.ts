import { expect, test } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, SEED_IDS, signOut, USERS } from "./fixtures";

/**
 * Área del tutor con datos: su hijo (Kid Local del seed) matriculado en un grupo con una clase y un
 * pago parcial; el tutor ve su horario, su saldo y da y retira el consentimiento de fotos.
 */
test("a guardian sees their child's enrolment, schedule and payments and manages the photo consent", async ({ page }) => {
  const admin = adminClient();
  const code = `E2E-FAM-${Date.now().toString(36).toUpperCase()}`;
  const { data: kid } = await admin.from("students").select("id").eq("full_name", "Kid Local").single();
  expect(kid).not.toBeNull();
  const { data: teacher } = await admin.from("profiles").select("id").eq("email", USERS.teacher).single();

  // El consentimiento de fotos necesita un texto vigente (si ya hay uno de otra prueba, se usa ese).
  const texts = await admin.from("consent_texts").select("id").eq("kind", "photos").lte("effective_from", new Date().toISOString().slice(0, 10)).limit(1);
  if ((texts.data ?? []).length === 0) {
    const created = await admin.from("consent_texts").insert({ id: `photos-v${Date.now()}`, kind: "photos", body_es: "TEXTO DE PRUEBA: autorizo las fotos.", body_en: "TEST TEXT: I authorise photos.", effective_from: "2026-01-01" });
    expect(created.error).toBeNull();
  }

  const group = await admin
    .from("groups")
    .insert({ code, name: `Grupo ${code}`, program_id: SEED_IDS.program, teacher_id: teacher!.id, format: "local_group", capacity: 5, status: "active" })
    .select("id")
    .single();
  expect(group.error).toBeNull();
  const groupId = group.data!.id;

  try {
    const enrollment = await admin
      .from("enrollments")
      .insert({ student_id: kid!.id, group_id: groupId, billing_mode: "upfront", agreed_amount_cents: 31000, status: "active" })
      .select("id")
      .single();
    expect(enrollment.error).toBeNull();
    const payment = await admin.from("enrollment_payments").insert({ enrollment_id: enrollment.data!.id, student_id: kid!.id, method: "transfer", amount_cents: 10000, reference: "E2E-REF" });
    expect(payment.error).toBeNull();
    const start = new Date(Date.now() + 48 * 3600_000);
    const session = await admin.from("sessions").insert({ group_id: groupId, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 70 * 60_000).toISOString(), teacher_id: teacher!.id });
    expect(session.error).toBeNull();

    await login(page, USERS.guardian);
    await expectPath(page, "/es/guardian");

    await page.goto("/es/guardian/children");
    await expect(page.getByRole("heading", { level: 1, name: "Mis hijos" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Kid Local" })).toBeVisible();
    await expect(page.getByText(`Grupo ${code}`)).toBeVisible();
    await expect(page.getByText("Saldo $210")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.goto("/es/guardian/schedule");
    await expect(page.getByText("Kid Local")).toBeVisible();
    await expect(page.getByText(new RegExp(`Grupo ${code}`))).toBeVisible();
    await expectNoAxeViolations(page);

    await page.goto("/es/guardian/payments");
    await expect(page.getByText("$210")).toBeVisible();
    await expect(page.getByText(/E2E-REF/)).toBeVisible();
    await expectNoAxeViolations(page);

    await page.goto("/es/guardian/consents");
    const photos = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Fotos" }) });
    await photos.getByRole("button", { name: "Autorizar" }).click();
    await expect(photos.getByText("Autorizado")).toBeVisible();
    await expectNoAxeViolations(page);
    await photos.getByRole("button", { name: "Retirar autorización" }).click();
    await expect(photos.getByText("Retirado")).toBeVisible();
    // Lo gestionado por la escuela no se puede cambiar desde aquí.
    const minor = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Tratamiento de datos del menor" }) });
    await expect(minor.getByRole("button")).toHaveCount(0);
    await signOut(page);
  } finally {
    await admin.from("enrollment_payments").delete().eq("student_id", kid!.id).eq("reference", "E2E-REF");
    await admin.from("enrollments").delete().eq("group_id", groupId);
    await admin.from("groups").delete().eq("id", groupId);
  }
});

/** Bandeja de cambios de clase de administración: ve y decide un pedido de cualquier grupo. */
test("the admin sees a class-change request from any group and approves it", async ({ page }) => {
  const admin = adminClient();
  const code = `E2E-ADM-${Date.now().toString(36).toUpperCase()}`;
  const { data: teacher } = await admin.from("profiles").select("id").eq("email", USERS.teacher).single();
  const group = await admin
    .from("groups")
    .insert({ code, name: `Grupo ${code}`, program_id: SEED_IDS.program, teacher_id: teacher!.id, format: "local_group", capacity: 5, status: "active" })
    .select("id")
    .single();
  expect(group.error).toBeNull();
  const groupId = group.data!.id;
  try {
    await admin.from("enrollments").insert({ student_id: SEED_IDS.students.local, group_id: groupId, billing_mode: "free", status: "active" });
    const start = new Date(Date.now() + 48 * 3600_000);
    const session = await admin
      .from("sessions")
      .insert({ group_id: groupId, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 70 * 60_000).toISOString(), teacher_id: teacher!.id })
      .select("id")
      .single();
    expect(session.error).toBeNull();
    const request = await admin.from("session_change_requests").insert({ session_id: session.data!.id, student_id: SEED_IDS.students.local, kind: "reschedule", note: "Prefiero el jueves" });
    expect(request.error).toBeNull();

    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Cambios de clase" }).click();
    await expectPath(page, "/es/admin/requests");
    const pending = page.getByRole("region", { name: "Pendientes" });
    await expect(pending.getByText("Prefiero el jueves")).toBeVisible();
    await expectNoAxeViolations(page);
    await pending.getByRole("button", { name: "Aprobar" }).first().click();
    await expect(page.getByRole("region", { name: "Historial" }).getByText("Aprobada").first()).toBeVisible();
  } finally {
    const sessions = (await admin.from("sessions").select("id").eq("group_id", groupId)).data ?? [];
    await admin.from("session_change_requests").delete().in("session_id", sessions.map((s) => s.id));
    await admin.from("enrollments").delete().eq("group_id", groupId);
    await admin.from("groups").delete().eq("id", groupId);
  }
});
