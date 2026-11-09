import { describe, expect, it } from "vitest";
import { parseForm } from "../forms";
import { blockSchema, lessonSchema, resourceSchema, teacherProfileSchema } from "./content";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("content schemas", () => {
  const resource = { kind: "video", accessLevel: "public", titleEs: "Vídeo", titleEn: "Video", video: "https://youtu.be/dQw4w9WgXcQ" };
  it("resourceSchema turns a youtu.be URL into youtubeId", () => {
    const result = parseForm(resourceSchema, form(resource));
    expect(result.ok && result.data.youtubeId).toBe("dQw4w9WgXcQ");
  });
  it("resourceSchema rejects a link without URL", () => expect(parseForm(resourceSchema, form({ ...resource, kind: "link", video: "" }))).toMatchObject({ ok: false, fieldErrors: { externalUrl: "required" } }));
  it("resourceSchema rejects http:// URLs", () => expect(parseForm(resourceSchema, form({ ...resource, video: "", kind: "link", externalUrl: "http://example.com" }))).toMatchObject({ ok: false }));
  it("resourceSchema rejects both video and externalUrl", () => expect(parseForm(resourceSchema, form({ ...resource, externalUrl: "https://example.com" }))).toMatchObject({ ok: false }));
  it("lessonSchema requires a level outside foundations", () => expect(parseForm(lessonSchema, form({ slug: "kids-a1", category: "kids", accessLevel: "public", titleEs: "A", titleEn: "A" }))).toMatchObject({ ok: false, fieldErrors: { levelId: "required" } }));
  it("lessonSchema rejects slug 'Los Colores'", () => expect(parseForm(lessonSchema, form({ slug: "Los Colores", category: "foundations", accessLevel: "public", titleEs: "A", titleEn: "A" }))).toMatchObject({ ok: false }));
  const block = { lessonId: "b0000000-0000-4000-8000-000000000101", kind: "quiz", bodyEs: "Pregunta", bodyEn: "Question", optionsEs: "Sí\nNo", optionsEn: "Yes\nNo", correctOption: "2" };
  it("quiz block rejects a correctOption beyond the options", () => expect(parseForm(blockSchema, form(block))).toMatchObject({ ok: false }));
  it("quiz block rejects 5 options", () => expect(parseForm(blockSchema, form({ ...block, optionsEs: "1\n2\n3\n4\n5", optionsEn: "1\n2\n3\n4\n5", correctOption: "0" }))).toMatchObject({ ok: false }));
  const teacher = { slug:"e2e-teacher", name:"Teacher", photoPosition:"50% 30%", photoAltEs:"Foto", photoAltEn:"Photo", roleEs:"Docente", roleEn:"Teacher", taglineEs:"Frase", taglineEn:"Tagline", metaDescriptionEs:"Meta", metaDescriptionEn:"Meta", introEs:"Intro", introEn:"Intro", bodyEs:"Bio", bodyEn:"Bio", factsEs:"Uno\nDos", factsEn:"One\nTwo" };
  it("teacher profile parses bilingual facts", () => expect(parseForm(teacherProfileSchema, form(teacher))).toMatchObject({ ok:true, data:{ factsEs:["Uno","Dos"], factsEn:["One","Two"] } }));
  it("teacher profile requires equal facts and paired enrolment fields", () => expect(parseForm(teacherProfileSchema, form({...teacher,factsEn:"One",enrolTitleEs:"Cursos"}))).toMatchObject({ok:false}));
  it("teacher profile limits facts to six lines", () => expect(parseForm(teacherProfileSchema, form({...teacher,factsEs:"1\n2\n3\n4\n5\n6\n7",factsEn:"1\n2\n3\n4\n5\n6\n7"}))).toMatchObject({ok:false}));
});
