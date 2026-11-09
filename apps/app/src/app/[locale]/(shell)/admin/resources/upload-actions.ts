"use server";
import { revalidatePath } from "next/cache";
import { parseForm, type ActionState } from "@/lib/forms";
import { toDomainError } from "@/lib/db-errors";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { pingWebRevalidate } from "@/lib/web-revalidate";
import { checkUpload, uploadRequestSchema, type UploadError, type UploadRequest, type UploadTarget } from "@/lib/uploads";
import { UPLOAD_RULES, extensionFor } from "@spanglish/content";
import { actionLocale } from "@/lib/action-locale";
import { z } from "zod";
const attachSchema = z.object({ ownerId: z.uuid(), target: z.enum(["resourceFile", "thumbnail", "lessonImage"]), path: z.string().min(1), mime: z.string().max(120), size: z.number().int().positive(), width: z.number().int().positive().optional(), height: z.number().int().positive().optional(), locale: z.enum(["es", "en"]).default("es") });
export async function requestUpload(input: UploadRequest): Promise<{ ok: true; bucket: string; path: string; token: string } | { ok: false; error: UploadError }> {
  await requireArea("es", "admin"); const parsed = uploadRequestSchema.safeParse(input); if (!parsed.success) return { ok: false, error: "type" };
  const checked = checkUpload(parsed.data); if (!checked.ok) return checked;
  const db = await createClient();
  if (parsed.data.target === "resourceFile" || parsed.data.target === "thumbnail") {
    const { data } = await db.from("resources").select("id").eq("id", parsed.data.ownerId).maybeSingle(); if (!data) return { ok: false, error: "forbidden" };
  } else {
    const { data } = await db.from("lessons").select("id, kind").eq("id", parsed.data.ownerId).maybeSingle(); if (!data || data.kind !== "article") return { ok: false, error: "forbidden" };
  }
  const result = await db.storage.from(checked.bucket).createSignedUploadUrl(checked.path);
  if (result.error || !result.data) return { ok: false, error: "unavailable" };
  return { ok: true, bucket: checked.bucket, path: checked.path, token: result.data.token };
}
export async function attachUpload(input: { ownerId: string; target: UploadTarget; path: string; mime: string; size: number; width?: number; height?: number; locale?: string }): Promise<ActionState> {
  const locale = input.locale === "en" ? "en" : "es"; await requireArea(locale, "admin");
  const parsed = attachSchema.safeParse(input); if (!parsed.success) return { status: "error", error: "forbidden" };
  const { data } = parsed;
  const rule = data.target === "resourceFile" ? UPLOAD_RULES.resourceFile : UPLOAD_RULES.contentImage;
  const extension = extensionFor(data.mime);
  if (!extension || !rule.mimeTypes.includes(data.mime as never) || data.size > rule.maxBytes) return { status: "error", error: "forbidden" };
  const expectedPath = data.target === "resourceFile" ? new RegExp(`^resources/${data.ownerId}/[0-9a-f-]+\\.${extension}$`) : data.target === "thumbnail" ? new RegExp(`^thumbnails/[0-9a-f-]+\\.${extension}$`) : new RegExp(`^lessons/${data.ownerId}/[0-9a-f-]+\\.${extension}$`);
  if (!expectedPath.test(data.path)) return { status: "error", error: "forbidden" };
  const checked = { bucket: rule.bucket };
  const db = await createClient(); const directory = data.path.slice(0, data.path.lastIndexOf("/")); const file = data.path.slice(data.path.lastIndexOf("/") + 1);
  const found = await db.storage.from(checked.bucket).list(directory, { search: file, limit: 1 });
  if (found.error) return { status: "error", error: "unknown" }; if (!found.data.some((entry) => entry.name === file)) return { status: "error", error: "not_found" };
  let old: string | null = null; let published = false;
  if (data.target === "resourceFile" || data.target === "thumbnail") {
    const { data: row } = await db.from("resources").select("file_path, thumbnail_path, status").eq("id", data.ownerId).maybeSingle(); if (!row) return { status: "error", error: "not_found" };
    old = data.target === "resourceFile" ? row.file_path : row.thumbnail_path; published = row.status === "published";
    const updates = data.target === "resourceFile" ? { file_path: data.path, file_mime: data.mime, file_size_bytes: data.size } : { thumbnail_path: data.path };
    const { error } = await db.from("resources").update(updates).eq("id", data.ownerId); if (error) return { status: "error", error: toDomainError(error) };
  } else {
    const { data: row } = await db.from("lessons").select("id, kind, status").eq("id", data.ownerId).maybeSingle();
    if (!row || row.kind !== "article") return { status: "error", error: "not_found" };
    published = row.status === "published";
  }
  if (old && old !== data.path) await db.storage.from(data.target === "resourceFile" ? "resource-files" : "content-media").remove([old]);
  revalidatePath(`/${data.locale}/admin/resources`); revalidatePath(`/${data.locale}/admin/lessons/${data.ownerId}`); if (published) await pingWebRevalidate(); return { status: "ok" };
}
export async function removeResourceFile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData); await requireArea(locale, "admin"); const id = formData.get("id"); if (typeof id !== "string") return { status: "error", error: "not_found" };
  const db = await createClient(); const { data: row } = await db.from("resources").select("file_path, status").eq("id", id).maybeSingle(); if (!row) return { status: "error", error: "not_found" };
  const { error } = await db.from("resources").update({ file_path: null, file_mime: null, file_size_bytes: null }).eq("id", id); if (error) return { status: "error", error: toDomainError(error) };
  if (row.file_path) await db.storage.from("resource-files").remove([row.file_path]); revalidatePath(`/${locale}/admin/resources`); if (row.status === "published") await pingWebRevalidate(); return { status: "ok" };
}
