import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

test.describe("modales y acciones con iconos", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
  });

  test("Nuevo alumno abre un modal que se cierra con el icono, con Escape o pulsando fuera", async ({ page }) => {
    await page.goto("/es/admin/students");
    const open = page.getByRole("button", { name: "Nuevo alumno" });
    const dialog = page.getByRole("dialog", { name: "Nuevo alumno" });
    await expect(dialog).toBeHidden();

    await open.click();
    await expect(dialog).toBeVisible();
    // Cerrar es solo un icono: sin texto visible, con nombre accesible.
    const close = dialog.getByRole("button", { name: "Cerrar" });
    expect(await close.innerText()).toBe("");
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();

    await open.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await open.click();
    await page.mouse.click(4, 4); // el velo, fuera del modal
    await expect(dialog).toBeHidden();
  });

  test("las direcciones /new abren el modal de la lista y al cerrarlo la dirección queda limpia", async ({ page }) => {
    for (const [path, list, name] of [
      ["/es/admin/students/new", "/es/admin/students", "Nuevo alumno"],
      ["/es/admin/teachers/new", "/es/admin/teachers", "Invitar docente"],
      ["/es/admin/resources/new", "/es/admin/resources", "Añadir recurso"],
      ["/es/admin/lessons/new", "/es/admin/lessons", "Añadir lección"],
      ["/es/admin/teachers/profiles/new", "/es/admin/teachers/profiles", "Añadir docente"],
      ["/es/admin/catalog/programs/new", "/es/admin/catalog/programs", "Nuevo programa"],
    ] as const) {
      await page.goto(path);
      const dialog = page.getByRole("dialog").first();
      await expect(dialog, path).toBeVisible();
      expect(new URL(page.url()).pathname, path).toBe(list);
      await dialog.getByRole("button", { name: "Cerrar" }).click();
      await expect(dialog, path).toBeHidden();
      await expectPath(page, list);
      await expect(page.getByRole("button", { name: new RegExp(name) }).first(), path).toBeVisible();
    }
  });

  test("el modal de nuevo alumno no tiene problemas de accesibilidad en móvil ni en escritorio", async ({ page }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 800 });
      await page.goto("/es/admin/students/new");
      await expect(page.getByRole("dialog", { name: "Nuevo alumno" })).toBeVisible();
      await expectNoAxeViolations(page);
    }
  });

  test("la tabla de alumnos se ordena por columna y las acciones de fila son solo iconos", async ({ page }) => {
    await page.goto("/es/admin/students");
    const table = page.getByRole("table");
    const names = async () => (await table.locator("tbody th[scope=row]").allInnerTexts()).map((text) => text.trim());
    const ascending = await names();
    expect(ascending.length).toBeGreaterThan(1);
    expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b, "es")));

    await table.getByRole("link", { name: "Nombre" }).click();
    await expect(page).toHaveURL(/sort=name&dir=desc/);
    expect(await names()).toEqual([...ascending].reverse());

    const row = table.getByRole("row", { name: /Student Two/ });
    const edit = row.getByRole("link", { name: "Editar" });
    expect(await edit.innerText()).toBe("");
    await expect(edit).toHaveAttribute("href", /\/es\/admin\/students\/[0-9a-f-]{36}$/);

    // Desactivar y reactivar (se deja como estaba).
    const deactivate = row.getByRole("button", { name: "Desactivar" });
    expect(await deactivate.innerText()).toBe("");
    await deactivate.click();
    await expect(row).toContainText("Inactivo");
    await row.getByRole("button", { name: "Reactivar" }).click();
    await expect(row).toContainText("Activo");
  });

  test("las acciones de fila de docentes y recursos son solo iconos", async ({ page }) => {
    await page.goto("/es/admin/teachers");
    const suspend = page.getByRole("row", { name: /Teacher Local/ }).getByRole("button", { name: /Suspender/ });
    expect(await suspend.innerText()).toBe("");

    await page.goto("/es/admin/resources");
    const row = page.getByRole("listitem").filter({ hasText: "Video para alumnos (local)" });
    for (const name of ["Editar", "Eliminar recurso"]) {
      const control = row.getByRole(name === "Editar" ? "link" : "button", { name });
      expect(await control.innerText(), name).toBe("");
    }
    // Eliminar pide confirmar con un icono (✓) y se puede cancelar con otro (✕); aquí se cancela.
    await row.getByRole("button", { name: "Eliminar recurso" }).click();
    const sure = row.getByRole("button", { name: "¿Seguro?" });
    await expect(sure).toBeVisible();
    expect(await sure.innerText()).toBe("");
    await row.getByRole("button", { name: "Cancelar" }).click();
    await expect(row.getByRole("button", { name: "Eliminar recurso" })).toBeFocused();
  });

  test("el menú lateral empieza por el Panel, sigue el orden por secciones y no hay nada en desarrollo", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const links = (await nav.getByRole("link").allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
    expect(links.some((text) => text.includes("En desarrollo"))).toBe(false);
    expect(links.slice(0, 4)).toEqual(["Panel", "Calendario", "Grupos", "Matrículas"]);
    expect(links).toContain("Alumnos");
    expect(links).toContain("Docentes");
  });
});
