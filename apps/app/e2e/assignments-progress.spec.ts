import { expect, test } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, SEED_CONTENT, SEED_IDS, signOut, USERS } from "./fixtures";

/**
 * Tareas de punta a punta: la docente crea una tarea, el alumno entrega texto y un archivo real
 * (sube a Storage con la política del bucket), la docente descarga el archivo y califica, y el
 * alumno ve la nota y su progreso. Crea su propio grupo y lo borra al terminar.
 */
test("a teacher creates an assignment, a student submits it, the teacher grades it and the progress updates", async ({ page }) => {
  const admin = adminClient();
  const code = `E2E-TASK-${Date.now().toString(36).toUpperCase()}`;
  const title = `Tarea ${code}`;
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

    // Docente: crea la tarea.
    await login(page, USERS.teacher);
    await expectPath(page, "/es/teacher");
    await page.goto("/es/teacher/assignments");
    await page.getByRole("button", { name: "Nueva tarea" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Grupo", { exact: true }).selectOption({ label: `Grupo ${code}` });
    await dialog.getByLabel("Título").fill(title);
    await dialog.getByLabel("Instrucciones").fill("Escribe tres frases sobre tu día.");
    await dialog.getByRole("button", { name: "Crear tarea" }).click();
    await expect(dialog.getByText("Cambios guardados.")).toBeVisible();
    await dialog.getByRole("button", { name: "Cerrar" }).click();
    // La lista queda tapada por el modal hasta que se cierra: sin esto axe mide el contraste bajo el velo.
    await expect(dialog).toBeHidden();
    await expect(page.getByText(title)).toBeVisible();
    await expectNoAxeViolations(page);
    await signOut(page);

    // Alumno: entrega texto y un archivo.
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    await page.goto("/es/student/assignments");
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    await expect(page.getByText("Por entregar")).toBeVisible();
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await page.getByLabel("Tu respuesta").fill("Hoy desayuné y fui a clase.");
    await page.locator("#submit-file").setInputFiles({ name: "tarea.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF") });
    await expect(page.getByText("tarea.pdf")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Entregar tarea" }).click();
    await expect(page.getByText(/Enviada el/)).toBeVisible();
    await signOut(page);

    // Docente: descarga el archivo y califica.
    await login(page, USERS.teacher);
    await expectPath(page, "/es/teacher");
    await page.goto("/es/teacher/assignments");
    await page.getByRole("link", { name: "Ver entregas y calificar" }).first().click();
    await expect(page.getByText("Hoy desayuné y fui a clase.")).toBeVisible();
    const fileLink = page.getByRole("link", { name: "tarea.pdf" });
    await expect(fileLink).toBeVisible();
    const download = await page.request.get((await fileLink.getAttribute("href")) as string, { maxRedirects: 0 });
    expect(download.status()).toBe(303);
    await page.getByLabel(/Nota \(máx\. 10\)/).fill("9,5");
    await page.getByLabel("Comentario").fill("Muy bien");
    await page.getByRole("button", { name: "Guardar nota" }).click();
    await expect(page.getByText("9,5 / 10")).toBeVisible();
    await expectNoAxeViolations(page);
    await signOut(page);

    // Alumno: ve la nota y su progreso; marca una lección como completada.
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    await page.goto("/es/student/assignments");
    await expect(page.getByText("Calificada")).toBeVisible();
    await expect(page.getByText("9,5 / 10")).toBeVisible();
    await page.goto(`/es/student/assignments/${(await admin.from("assignments").select("id").eq("group_id", groupId).single()).data!.id}`);
    await expect(page.getByText("Muy bien")).toBeVisible();
    await expect(page.getByText("Tu docente ya la calificó")).toBeVisible();

    await page.goto(`/es/student/learn/${SEED_CONTENT.lessons.public.slug}`);
    await page.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(page.getByRole("button", { name: "Completada" })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/es/student/progress");
    await expect(page.getByRole("heading", { level: 1, name: "Progreso" })).toBeVisible();
    await expect(page.getByText("95%")).toBeVisible();
    await expect(page.getByRole("link", { name: /Colores/i }).first()).toBeVisible();
    await expectNoAxeViolations(page);
  } finally {
    const assignments = (await admin.from("assignments").select("id").eq("group_id", groupId)).data ?? [];
    for (const a of assignments) {
      const files = (await admin.from("assignment_submissions").select("file_path").eq("assignment_id", a.id)).data ?? [];
      const paths = files.map((f) => f.file_path).filter((p): p is string => Boolean(p));
      if (paths.length > 0) await admin.storage.from("assignment-files").remove(paths);
    }
    await admin.from("assignments").delete().eq("group_id", groupId);
    await admin.from("lesson_completions").delete().eq("student_id", SEED_IDS.students.local).eq("lesson_id", SEED_CONTENT.lessons.public.id);
    await admin.from("enrollments").delete().eq("group_id", groupId);
    await admin.from("groups").delete().eq("id", groupId);
  }
});
