"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseForm, type ActionState } from "@/lib/forms";
import { toDomainError } from "@/lib/db-errors";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { moveSchema, publishSchema, resourceSchema, type ResourceField } from "@/lib/schemas/content";
import { pingWebRevalidate } from "@/lib/web-revalidate";

async function changed(locale: string, published: boolean) {
  revalidatePath(`/${locale}/admin/resources`);
  if (published) await pingWebRevalidate();
}
export async function saveResource(_prev: ActionState<ResourceField>, formData: FormData): Promise<ActionState<ResourceField>> {
  const locale = String(formData.get("locale") ?? "es");
  const user = await requireArea(locale as "es" | "en", "admin");
  const parsed = parseForm(resourceSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { data } = parsed; const supabase = await createClient();
  const values = { kind: data.kind, access_level: data.accessLevel, title_es: data.titleEs, title_en: data.titleEn, title_lang: data.titleLang ?? null,
    description_es: data.descriptionEs ?? null, description_en: data.descriptionEn ?? null, level_id: data.levelId ?? null, audience: data.audience ?? null,
    external_url: data.externalUrl ?? null, youtube_id: data.youtubeId, teaser_public: data.teaserPublic, language_code: "es" };
  try {
    if (data.id) {
      const { data: prior } = await supabase.from("resources").select("status, file_path").eq("id", data.id).maybeSingle();
      const clearsFile = data.kind === "video" || data.kind === "link" || Boolean(data.youtubeId || data.externalUrl);
      const updateValues = clearsFile ? { ...values, file_path: null, file_mime: null, file_size_bytes: null } : values;
      const { error } = await supabase.from("resources").update(updateValues).eq("id", data.id);
      if (error) return { status: "error", error: toDomainError(error) };
      if (clearsFile && prior?.file_path) await supabase.storage.from("resource-files").remove([prior.file_path]);
      revalidatePath(`/${locale}/admin/resources/${data.id}`);
      await changed(locale, prior?.status === "published");
      return { status: "ok" };
    }
    const { data: last } = await supabase.from("resources").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data: created, error } = await supabase.from("resources").insert({ ...values, sort_order: (last?.sort_order ?? 0) + 10, created_by: user.id }).select("id").single();
    if (error) return { status: "error", error: toDomainError(error) };
    await changed(locale, false);
    redirect(`/${locale}/admin/resources/${created.id}?saved=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", error: "unknown" };
  }
}
export async function setResourcePublished(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin");
  const parsed = parseForm(publishSchema, formData); if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const supabase = await createClient(); const { error } = await supabase.from("resources").update({ status: parsed.data.publish === "true" ? "published" : "draft", published_at: parsed.data.publish === "true" ? new Date().toISOString() : null }).eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) }; await changed(locale, true); return { status: "ok" };
}
export async function moveResource(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin");
  const parsed = parseForm(moveSchema, formData); if (!parsed.ok) return;
  const supabase = await createClient(); const { data: row } = await supabase.from("resources").select("status").eq("id", parsed.data.id).maybeSingle();
  const { error } = await supabase.rpc("move_resource", { p_resource_id: parsed.data.id, p_direction: parsed.data.direction });
  if (error) throw error;
  revalidatePath(`/${locale}/admin/resources`);
  if (row?.status === "published") await pingWebRevalidate();
}
export async function deleteResource(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin");
  const id = formData.get("id"); if (typeof id !== "string") return { status: "error", error: "not_found" };
  const supabase = await createClient(); const { data: row } = await supabase.from("resources").select("status, file_path, thumbnail_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("resources").delete().eq("id", id); if (error) return { status: "error", error: toDomainError(error) };
  const paths = [row?.file_path, row?.thumbnail_path].filter((path): path is string => Boolean(path));
  if (paths.length) { await supabase.storage.from("resource-files").remove(paths.filter((path) => path.startsWith("resources/"))); await supabase.storage.from("content-media").remove(paths.filter((path) => path.startsWith("thumbnails/"))); }
  await changed(locale, row?.status === "published"); return { status: "ok" };
}
