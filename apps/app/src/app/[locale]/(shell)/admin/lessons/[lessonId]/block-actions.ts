"use server";
import { revalidatePath } from "next/cache";
import { parseForm, type ActionState } from "@/lib/forms";
import { toDomainError } from "@/lib/db-errors";
import { blockSchema, moveSchema } from "@/lib/schemas/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { pingWebRevalidate } from "@/lib/web-revalidate";
import type { TablesInsert, TablesUpdate } from "@spanglish/db";
import { parseGameSource, parseYouTubeId } from "@spanglish/content";
async function refresh(locale: string, lessonId: string, published: boolean) { revalidatePath(`/${locale}/admin/lessons/${lessonId}`); revalidatePath(`/${locale}/admin/lessons/${lessonId}/preview`); if (published) await pingWebRevalidate(); }
export async function saveBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin");
  const parsed = parseForm(blockSchema, formData); if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { data } = parsed; const db = await createClient(); const { data: lesson } = await db.from("lessons").select("status, kind").eq("id", data.lessonId).maybeSingle();
  if (!lesson || lesson.kind !== "article") return { status: "error", error: "not_found" };
  const { data: last } = await db.from("lesson_blocks").select("position").eq("lesson_id", data.lessonId).order("position", { ascending: false }).limit(1).maybeSingle();
  const position = data.id ? 0 : (last?.position ?? 0) + 10;
  let values: TablesInsert<"lesson_blocks"> = { lesson_id: data.lessonId, kind: data.kind, position };
  if (data.kind === "text") values = { ...values, body_es: data.bodyEs, body_en: data.bodyEn };
  if (data.kind === "image") values = { ...values, image_path: data.imagePath, image_width: data.imageWidth, image_height: data.imageHeight, alt_es: data.altEs, alt_en: data.altEn };
  if (data.kind === "video") values = { ...values, youtube_id: parseYouTubeId(data.video) };
  if (data.kind === "quiz") values = { ...values, body_es: data.bodyEs, body_en: data.bodyEn, options_es: data.optionsEs.split(/\r?\n/).map((value) => value.trim()).filter(Boolean), options_en: data.optionsEn.split(/\r?\n/).map((value) => value.trim()).filter(Boolean), correct_option: data.correctOption, explanation_es: data.explanationEs ?? null, explanation_en: data.explanationEn ?? null };
  if (data.kind === "game") {
    const game = parseGameSource(data.gameType, data.source);
    if (!game.ok) return { status: "invalid", fieldErrors: { source: "invalid" } };
    values = { ...values, body_es: data.bodyEs, body_en: data.bodyEn, game_type: data.gameType, game_data: { items: game.data.items } };
  }
  const updateValues: TablesUpdate<"lesson_blocks"> = { ...values };
  delete updateValues.position;
  const result = data.id ? await db.from("lesson_blocks").update(updateValues).eq("id", data.id) : await db.from("lesson_blocks").insert(values);
  if (result.error) return { status: "error", error: toDomainError(result.error) }; await refresh(locale, data.lessonId, lesson.status === "published"); return { status: "ok" };
}
export async function moveBlock(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin"); const parsed = parseForm(moveSchema, formData); if (!parsed.ok) return;
  const db = await createClient(); const { data: block } = await db.from("lesson_blocks").select("lesson_id, lessons(status)").eq("id", parsed.data.id).maybeSingle();
  const { error } = await db.rpc("move_lesson_block", { p_block_id: parsed.data.id, p_direction: parsed.data.direction });
  if (error) throw error;
  if (block) await refresh(locale, block.lesson_id, block.lessons?.status === "published");
}
export async function deleteBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin"); const blockId = formData.get("id"); const lessonId = formData.get("lessonId");
  if (typeof blockId !== "string" || typeof lessonId !== "string") return { status: "error", error: "not_found" };
  const db = await createClient(); const { data: lesson } = await db.from("lessons").select("status").eq("id", lessonId).maybeSingle(); if (!lesson) return { status: "error", error: "not_found" };
  const { data: block } = await db.from("lesson_blocks").select("image_path").eq("id", blockId).eq("lesson_id", lessonId).maybeSingle(); if (!block) return { status: "error", error: "not_found" };
  const { error } = await db.from("lesson_blocks").delete().eq("id", blockId); if (error) return { status: "error", error: toDomainError(error) };
  if (block.image_path) await db.storage.from("content-media").remove([block.image_path]); await refresh(locale, lessonId, lesson.status === "published"); return { status: "ok" };
}
