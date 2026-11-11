"use server";

import { revalidatePath } from "next/cache";
import { extensionFor, UPLOAD_RULES } from "@spanglish/content";
import { toDomainError, type DomainError } from "@/lib/db-errors";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_TYPES: readonly string[] = UPLOAD_RULES.contentImage.mimeTypes;
const BUCKET = UPLOAD_RULES.contentImage.bucket;

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: DomainError | "type" | "size" };

/**
 * Cuenta sobre la que se actúa: la propia, o la de otra persona si quien llama
 * es administración. Devuelve null si no se puede.
 */
async function targetOf(userId?: string): Promise<string | null> {
  const me = await getSessionUser();
  if (!me || me.status !== "active" || me.roles.length === 0) return null;
  if (!userId || userId === me.id) return me.id;
  if (!UUID.test(userId) || !me.roles.includes("admin")) return null;
  return userId;
}

/** Paso 1: ruta y token de subida firmada para la foto (la política de Storage repite la regla). */
export async function requestAvatarUpload(input: {
  userId?: string;
  mime: string;
  size: number;
}): Promise<Result<{ path: string; token: string }>> {
  const target = await targetOf(input.userId);
  if (!target) return { ok: false, error: "forbidden" };
  const extension = extensionFor(input.mime);
  if (!extension || !IMAGE_TYPES.includes(input.mime)) return { ok: false, error: "type" };
  if (input.size > UPLOAD_RULES.contentImage.maxBytes) return { ok: false, error: "size" };

  const path = `avatars/${target}/${crypto.randomUUID()}.${extension}`;
  const signed = await (await createClient()).storage.from(BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data) return { ok: false, error: "unknown" };
  return { ok: true, path, token: signed.data.token };
}

/** Paso 2: comprueba que el archivo existe, lo guarda en el perfil y borra la foto anterior. */
export async function attachAvatar(input: { userId?: string; path: string; locale?: string }): Promise<Result> {
  const target = await targetOf(input.userId);
  if (!target) return { ok: false, error: "forbidden" };
  const match = new RegExp(`^avatars/${target}/[0-9a-f-]{36}\\.(png|jpg|webp)$`).exec(input.path);
  if (!match) return { ok: false, error: "forbidden" };

  const db = await createClient();
  const directory = `avatars/${target}`;
  const file = input.path.slice(directory.length + 1);
  const found = await db.storage.from(BUCKET).list(directory, { search: file, limit: 1 });
  if (found.error) return { ok: false, error: "unknown" };
  if (!found.data.some((entry) => entry.name === file)) return { ok: false, error: "not_found" };

  const before = await db.from("profiles").select("avatar_path").eq("id", target).maybeSingle();
  const updated = await db.from("profiles").update({ avatar_path: input.path }).eq("id", target).select("id").maybeSingle();
  if (updated.error) return { ok: false, error: toDomainError(updated.error) };
  if (!updated.data) return { ok: false, error: "not_found" };

  const old = before.data?.avatar_path;
  if (old && old !== input.path) await db.storage.from(BUCKET).remove([old]);
  revalidatePath(`/${input.locale === "en" ? "en" : "es"}`, "layout");
  return { ok: true };
}

/** Quita la foto: vuelve la inicial. */
export async function removeAvatar(input: { userId?: string; locale?: string }): Promise<Result> {
  const target = await targetOf(input.userId);
  if (!target) return { ok: false, error: "forbidden" };
  const db = await createClient();
  const before = await db.from("profiles").select("avatar_path").eq("id", target).maybeSingle();
  const updated = await db.from("profiles").update({ avatar_path: null }).eq("id", target).select("id").maybeSingle();
  if (updated.error) return { ok: false, error: toDomainError(updated.error) };
  if (before.data?.avatar_path) await db.storage.from(BUCKET).remove([before.data.avatar_path]);
  revalidatePath(`/${input.locale === "en" ? "en" : "es"}`, "layout");
  return { ok: true };
}
