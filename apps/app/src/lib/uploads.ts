import { z } from "zod";
import { UPLOAD_RULES, extensionFor } from "@spanglish/content";

export const uploadRequestSchema = z.object({ ownerId: z.uuid(), target: z.enum(["resourceFile", "thumbnail", "lessonImage"]), fileName: z.string().min(1).max(200), mime: z.string().max(120), size: z.number().int().positive() });
export type UploadTarget = z.infer<typeof uploadRequestSchema>["target"];
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type UploadError = "type" | "size" | "forbidden" | "missing" | "unavailable";
export function checkUpload(input: UploadRequest): { ok: true; bucket: string; path: string } | { ok: false; error: UploadError } {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "type" };
  const extension = extensionFor(input.mime);
  if (!extension) return { ok: false, error: "type" };
  const rule = input.target === "resourceFile" ? UPLOAD_RULES.resourceFile : UPLOAD_RULES.contentImage;
  if (!rule.mimeTypes.includes(input.mime as never)) return { ok: false, error: "type" };
  if (input.size > rule.maxBytes) return { ok: false, error: "size" };
  const uuid = crypto.randomUUID();
  const path = input.target === "resourceFile" ? `resources/${input.ownerId}/${uuid}.${extension}` : input.target === "thumbnail" ? `thumbnails/${uuid}.${extension}` : `lessons/${input.ownerId}/${uuid}.${extension}`;
  return { ok: true, bucket: rule.bucket, path };
}
