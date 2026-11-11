import { expect, test } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, SEED_IDS, signOut, USERS } from "./fixtures";

/**
 * Cambios de clase de punta a punta: la alumna avisa que no asistirá, la docente del grupo lo
 * aprueba y la alumna ve la respuesta. De paso recorre las pantallas de la docente (grupos,
 * calendario, recursos). Crea su propio grupo y lo borra al terminar.
 */
test("a student asks to miss a class, the teacher approves it and the student sees the answer", async ({ page }) => {
  const admin = adminClient();
  const code = `E2E-CHG-${Date.now().toString(36).toUpperCase()}`;
  const { data: teacher } = await admin.from("profiles").select("id").eq("email", USERS.teacher).single();
  expect(teacher).not.toBeNull();

  const group = await admin
    .from("groups")
    .insert({ code, name: `Grupo ${code}`, program_id: SEED_IDS.program, teacher_id: teacher!.id, format: "local_group", capacity: 5, status: "active" })
    .select("id")
    .single();
  expect(group.error).toBeNull();
  const groupId = group.data!.id;

  try {
    const enrolled = await admin.from("enrollments").insert({ student_id: SEED_IDS.students.local, group_id: groupId, billing_mode: "free", status: "active" });
    expect(enrolled.error).toBeNull();
    const start = new Date(Date.now() + 36 * 3600_000);
    const session = await admin
      .from("sessions")
      .insert({ group_id: groupId, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 70 * 60_000).toISOString(), teacher_id: teacher!.id });
    expect(session.error).toBeNull();

    // Alumna: pide el cambio.
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    await page.goto("/es/student/requests");
    await expect(page.getByRole("heading", { level: 1, name: "Cambios de clase" })).toBeVisible();
    const option = page.getByLabel("Clase", { exact: true }).locator("option", { hasText: `Grupo ${code}` }).first();
    await page.getByLabel("Clase", { exact: true }).selectOption((await option.getAttribute("value")) as string);
    await page.getByLabel("Motivo").fill("Tengo un viaje");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    const mine = page.getByRole("region", { name: "Mis solicitudes" });
    await expect(mine.getByText("Pendiente")).toBeVisible();
    await expect(mine.getByText(`Grupo ${code}`)).toBeVisible();
    await signOut(page);

    // Docente: ve la solicitud y la aprueba.
    await login(page, USERS.teacher);
    await expectPath(page, "/es/teacher");
    await page.goto("/es/teacher/requests");
    const pending = page.getByRole("region", { name: "Pendientes" });
    await expect(pending.getByText("Student Local")).toBeVisible();
    await expect(pending.getByText("Tengo un viaje")).toBeVisible();
    await expectNoAxeViolations(page);
    await pending.getByLabel("Respuesta (opcional)").fill("Gracias por avisar");
    await pending.getByRole("button", { name: "Aprobar" }).click();
    const history = page.getByRole("region", { name: "Historial" });
    await expect(history.getByText("Aprobada")).toBeVisible();
    await expect(history.getByText("“Gracias por avisar”")).toBeVisible();

    // Pantallas de la docente con datos.
    await page.goto("/es/teacher/groups");
    await expect(page.getByRole("heading", { level: 1, name: "Mis grupos" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: `Grupo ${code}` })).toBeVisible();
    await expect(page.getByText("Student Local")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.goto("/es/teacher/calendar");
    await expect(page.getByRole("heading", { level: 1, name: "Calendario" })).toBeVisible();
    await page.goto("/es/teacher/resources");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await signOut(page);

    // Alumna: ve la respuesta.
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    await page.goto("/es/student/requests");
    await expect(page.getByRole("region", { name: "Mis solicitudes" }).getByText("Aprobada")).toBeVisible();
    await expect(page.getByText("Respuesta: Gracias por avisar")).toBeVisible();
    await expectNoAxeViolations(page);
  } finally {
    await admin.from("session_change_requests").delete().in("session_id", ((await admin.from("sessions").select("id").eq("group_id", groupId)).data ?? []).map((s) => s.id));
    await admin.from("enrollments").delete().eq("group_id", groupId);
    await admin.from("groups").delete().eq("id", groupId);
  }
});
