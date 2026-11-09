import { describe, expect, it } from "vitest";
import { rowToView, type TeacherRow } from "./teachers-rows";

const ROW: TeacherRow = {
  slug: "ana-diaz",
  name: "Ana Díaz",
  photo_path: "teachers/d2100000-0000-4000-8000-0000000000f1.webp",
  photo_position: "50% 20%",
  photo_alt_es: "Retrato de Ana",
  photo_alt_en: "Portrait of Ana",
  role_es: "Profesora",
  role_en: "Tutor",
  tagline_es: "Lema",
  tagline_en: "Tagline",
  meta_description_es: "Meta es",
  meta_description_en: "Meta en",
  intro_es: "Intro es",
  intro_en: "Intro en",
  body_es: "Cuerpo es",
  body_en: "Body en",
  specialty_es: "Especialidad",
  specialty_en: "Speciality",
  enrol_title_es: null,
  enrol_title_en: null,
  enrol_es: null,
  enrol_en: null,
  facts_es: ["Uno"],
  facts_en: ["One"],
  show_approach: false,
  sort_order: 30,
};

const ENV = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" };

describe("rowToView", () => {
  it("resolves every text to the page language", () => {
    const es = rowToView(ROW, "es", ENV);
    expect(es).toMatchObject({ role: "Profesora", tagline: "Lema", intro: "Intro es", body: "Cuerpo es", facts: ["Uno"], photoAlt: "Retrato de Ana" });
    const en = rowToView(ROW, "en", ENV);
    expect(en).toMatchObject({ role: "Tutor", tagline: "Tagline", specialty: "Speciality", facts: ["One"], metaDescription: "Meta en" });
  });

  it("turns optional nulls into undefined and builds the photo URL", () => {
    const view = rowToView(ROW, "es", ENV);
    expect(view.enrol).toBeUndefined();
    expect(view.enrolTitle).toBeUndefined();
    expect(view.photo).toBe("https://x.supabase.co/storage/v1/object/public/content-media/teachers/d2100000-0000-4000-8000-0000000000f1.webp");
  });

  it("has no photo when the row has none or the platform is not configured", () => {
    expect(rowToView({ ...ROW, photo_path: null }, "es", ENV).photo).toBeNull();
    expect(rowToView(ROW, "es", {}).photo).toBeNull();
  });

  it("keeps the bundled photo of the original teachers until one is uploaded", () => {
    expect(rowToView({ ...ROW, slug: "pamela-rojas", photo_path: null }, "es", ENV).photo).toBe("/pamela.webp");
  });
});
