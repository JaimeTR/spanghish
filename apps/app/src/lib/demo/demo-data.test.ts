import { describe, expect, it } from "vitest";
import { blockSchema, lessonSchema, resourceSchema } from "../schemas/content";
import { assertDemoTarget, buildDemoContent, demoUsers, minimalPdf, parseArgs } from "./demo-data";
import { demoMediaPaths, describePlan } from "./demo-run";

describe("datos de demostración", () => {
  it("rechaza un ref que no coincide con la URL y localhost", () => {
    expect(() => assertDemoTarget({ NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "secret", DEMO_SEED_PROJECT_REF: "xyz" })).toThrow();
    expect(() => assertDemoTarget({ NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321", SUPABASE_SERVICE_ROLE_KEY: "secret", DEMO_SEED_PROJECT_REF: "localhost" })).toThrow();
  });
  it("lista todas las variables de contraseña que faltan", () => {
    expect(() => demoUsers({})).toThrow(/DEMO_PASSWORD_ADMIN.*DEMO_PASSWORD_TEACHER.*DEMO_PASSWORD_STUDENT.*DEMO_PASSWORD_VISITOR/);
  });
  it("genera ids y títulos DEMO, y niveles de acceso completos", () => {
    const data = buildDemoContent();
    for (const resource of data.resources) expect(resourceSchema.safeParse({ kind: resource.kind, accessLevel: resource.access_level, titleEs: resource.title_es, titleEn: resource.title_en, descriptionEs: resource.description_es ?? undefined, descriptionEn: resource.description_en ?? undefined, externalUrl: resource.external_url ?? undefined, video: resource.youtube_id ? `https://youtu.be/${resource.youtube_id}` : undefined, teaserPublic: "on" }).success).toBe(true);
    expect([...data.resources, ...data.lessons, ...data.blocks, ...data.locations, ...data.programs].every((row) => row.id?.startsWith("de000000"))).toBe(true);
    expect([...data.resources, ...data.lessons].every((row) => row.title_es.startsWith("DEMO · ") && row.title_en.startsWith("DEMO · "))).toBe(true);
    expect(data.locations.every((row) => row.name.startsWith("DEMO · "))).toBe(true);
    expect(data.programs.every((row) => row.name_es.startsWith("DEMO · ") && row.name_en.startsWith("DEMO · "))).toBe(true);
    expect(new Set(data.resources.map((row) => row.access_level)).size).toBe(3);
    expect(new Set(data.lessons.map((row) => row.access_level)).size).toBe(3);
  });
  it("valida las lecciones y bloques con los esquemas", () => {
    const data = buildDemoContent();
    for (const lesson of data.lessons) expect(lessonSchema.safeParse({ slug: lesson.slug, category: lesson.category, levelId: lesson.level_id ?? undefined, accessLevel: lesson.access_level, titleEs: lesson.title_es, titleEn: lesson.title_en, summaryEs: lesson.summary_es ?? undefined, summaryEn: lesson.summary_en ?? undefined, teaserPublic: "on" }).success).toBe(true);
    for (const block of data.blocks) {
      const shape = block.kind === "text" ? { lessonId: block.lesson_id, kind: block.kind, bodyEs: block.body_es, bodyEn: block.body_en }
        : block.kind === "video" ? { lessonId: block.lesson_id, kind: block.kind, video: `https://youtu.be/${block.youtube_id}` }
          : block.kind === "image" ? { lessonId: block.lesson_id, kind: block.kind, imagePath: block.image_path, imageWidth: block.image_width, imageHeight: block.image_height, altEs: block.alt_es, altEn: block.alt_en }
            : { lessonId: block.lesson_id, kind: block.kind, bodyEs: block.body_es, bodyEn: block.body_en, optionsEs: block.options_es?.join("\n"), optionsEn: block.options_en?.join("\n"), correctOption: block.correct_option };
      expect(blockSchema.safeParse(shape).success).toBe(true);
    }
  });
  it("el plan en seco nombra cuentas y contenido, nunca contraseñas", () => {
    const env = { DEMO_PASSWORD_ADMIN: "clave-admin-000", DEMO_PASSWORD_TEACHER: "clave-docente-00", DEMO_PASSWORD_STUDENT: "clave-alumna-000", DEMO_PASSWORD_VISITOR: "clave-visita-000" };
    const plan = describePlan("seed", demoUsers(env), buildDemoContent()).join(" | ");
    expect(plan).toContain("admin.demo@demo.spanglish.test");
    expect(plan).toContain("DEMO · Los colores (public)");
    expect(plan).not.toMatch(/clave-/);
    expect(describePlan("remove", demoUsers(env), buildDemoContent())[0]).toMatch(/^Borrar 4 cuentas/);
  });
  it("las imágenes públicas del demo son la miniatura y la imagen del bloque", () => {
    expect(demoMediaPaths(buildDemoContent())).toEqual([
      "thumbnails/de000000-0000-4000-8000-000000000001.png",
      "lessons/de000000-0000-4000-8000-000000000011/de000000-0000-4000-8000-000000000132.png",
    ]);
  });
  it("crea un PDF mínimo con cabecera y cierre", () => {
    const pdf = new TextDecoder().decode(minimalPdf("Saludos"));
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });
  it("parsea seed, remove y dry-run y rechaza argumentos inválidos", () => {
    expect(parseArgs([])).toEqual({ command: "seed", dryRun: false });
    expect(parseArgs(["remove", "--dry-run"])).toEqual({ command: "remove", dryRun: true });
    expect(() => parseArgs(["oops"])).toThrow(/Uso:/);
  });
  it("no incluye emails ni teléfonos en el contenido", () => {
    const data = buildDemoContent();
    const text = JSON.stringify({ resources: data.resources, lessons: data.lessons, blocks: data.blocks, locations: data.locations, programs: data.programs }, (key, value) => key === "id" || key.endsWith("_id") || key.endsWith("_path") || key === "youtube_id" ? undefined : value);
    expect(text).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    expect(text).not.toMatch(/(?:\+?\d[\s().-]*){8,}/);
  });
});
