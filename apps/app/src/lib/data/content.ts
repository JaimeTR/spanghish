import "server-only";
import type { Database, Tables } from "@spanglish/db";
import { parsePublishedLessonDetail, parsePublishedResources, type LessonBlock, type PublishedLessonDetail, type PublishedLessonSummary, type PublishedResource } from "@spanglish/content";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./catalog";

type Client = SupabaseClient<Database>;
type ResourceRow = Tables<"resources">;
type LessonRow = Tables<"lessons">;
type BlockRow = Tables<"lesson_blocks">;
export type AdminResourceRow = ResourceRow & { levelCode: string | null };
export type AdminLessonRow = LessonRow & { levelCode: string | null; blockCount: number };
function fail(scope: string, error: { code?: string }): never { throw new Error(`${scope}: ${error.code ?? "error"}`); }

export async function listAdminResources(supabase: Client, q: { status?: ResourceRow["status"]; kind?: ResourceRow["kind"] } = {}): Promise<AdminResourceRow[]> {
  let query = supabase.from("resources").select("*, levels(code)");
  if (q.status) query = query.eq("status", q.status);
  if (q.kind) query = query.eq("kind", q.kind);
  const { data, error } = await query.order("access_level").order("sort_order");
  if (error) fail("listAdminResources", error);
  return data.map(({ levels, ...row }) => ({ ...row, levelCode: levels?.code ?? null }));
}
export async function getAdminResource(supabase: Client, id: string): Promise<ResourceRow | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase.from("resources").select("*").eq("id", id).maybeSingle();
  if (error) fail("getAdminResource", error); return data;
}
export async function listAdminLessons(supabase: Client): Promise<AdminLessonRow[]> {
  const { data, error } = await supabase.from("lessons").select("*, levels(code), lesson_blocks(id)").order("category").order("level_id").order("sort_order");
  if (error) fail("listAdminLessons", error);
  return data.map(({ levels, lesson_blocks, ...row }) => ({ ...row, levelCode: levels?.code ?? null, blockCount: lesson_blocks.length }));
}
function toLessonBlock(row: BlockRow): LessonBlock {
  if (row.kind === "text" && row.body_es !== null && row.body_en !== null) return { id: row.id, position: row.position, kind: "text", bodyEs: row.body_es, bodyEn: row.body_en };
  if (row.kind === "image" && row.image_path && row.image_width && row.image_height && row.alt_es && row.alt_en) return { id: row.id, position: row.position, kind: "image", imagePath: row.image_path, imageWidth: row.image_width, imageHeight: row.image_height, altEs: row.alt_es, altEn: row.alt_en };
  if (row.kind === "video" && row.youtube_id) return { id: row.id, position: row.position, kind: "video", youtubeId: row.youtube_id };
  if (row.kind === "quiz" && row.body_es && row.body_en && row.options_es && row.options_en && row.correct_option !== null) return { id: row.id, position: row.position, kind: "quiz", bodyEs: row.body_es, bodyEn: row.body_en, optionsEs: row.options_es, optionsEn: row.options_en, correctOption: row.correct_option, explanationEs: row.explanation_es, explanationEn: row.explanation_en };
  throw new Error(`Invalid lesson block ${row.id}`);
}
export { toLessonBlock };
export async function getAdminLesson(supabase: Client, id: string): Promise<{ lesson: LessonRow; blocks: LessonBlock[] } | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase.from("lessons").select("*, lesson_blocks(*)").eq("id", id).maybeSingle();
  if (error) fail("getAdminLesson", error); if (!data) return null;
  return { lesson: (({ lesson_blocks: _blocks, ...lesson }) => lesson)(data), blocks: data.lesson_blocks.map(toLessonBlock).sort((a, b) => a.position - b.position) };
}
export async function listLevels(supabase: Client, languageCode = "es"): Promise<{ id: string; code: string }[]> {
  const { data, error } = await supabase.from("levels").select("id, code").eq("language_code", languageCode).order("sort");
  if (error) fail("listLevels", error); return data;
}
export async function listPortalResources(supabase: Client): Promise<PublishedResource[]> {
  const { data, error } = await supabase.rpc("list_published_resources");
  if (error) fail("listPortalResources", error);
  return parsePublishedResources(data);
}
export async function listPortalLessons(supabase: Client): Promise<PublishedLessonSummary[]> {
  const { data, error } = await supabase.rpc("list_published_lessons");
  if (error) fail("listPortalLessons", error);
  return data.map((row) => ({ id: row.id, slug: row.slug, kind: row.kind, componentKey: row.component_key as PublishedLessonSummary["componentKey"], category: row.category, levelCode: row.level_code, accessLevel: row.access_level, locked: row.locked, titleEs: row.title_es, titleEn: row.title_en, summaryEs: row.summary_es, summaryEn: row.summary_en, sortOrder: row.sort_order }));
}
export async function getPortalLesson(supabase: Client, slug: string): Promise<PublishedLessonDetail | null> {
  const { data, error } = await supabase.rpc("get_published_lesson", { p_slug: slug });
  if (error) fail("getPortalLesson", error); return parsePublishedLessonDetail(data);
}
