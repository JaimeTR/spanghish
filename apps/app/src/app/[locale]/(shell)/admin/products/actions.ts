"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError, type DomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import {
  FILE_EXTENSIONS,
  PRODUCT_COVER_MAX_BYTES,
  PRODUCT_COVER_TYPES,
  PRODUCT_FILE_MAX_BYTES,
  PRODUCT_FILE_TYPES,
  productIdSchema,
  productSchema,
  publishProductSchema,
  type ProductField,
} from "@/lib/schemas/products";
import { createClient } from "@/lib/supabase/server";
import { pingWebRevalidate } from "@/lib/web-revalidate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function refresh(locale: string, id?: string) {
  revalidatePath(`/${locale}/admin/products`);
  if (id) revalidatePath(`/${locale}/admin/products/${id}`);
  await pingWebRevalidate();
}

/** Crea o edita los datos de un producto. Al crear, abre su ficha para subir portada y archivo. */
export async function saveProduct(_prev: ActionState<ProductField>, formData: FormData): Promise<ActionState<ProductField>> {
  const locale = actionLocale(formData);
  const user = await requireArea(locale, "admin");
  const parsed = parseForm(productSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;
  const db = await createClient();
  const values = {
    slug: d.slug,
    name_es: d.nameEs,
    name_en: d.nameEn,
    summary_es: d.summaryEs ?? null,
    summary_en: d.summaryEn ?? null,
    price_cents: d.price,
    compare_at_cents: d.compareAt ?? null,
  };
  const fail = (error: Parameters<typeof toDomainError>[0]): ActionState<ProductField> => {
    if (error && "code" in error && error.code === "23505") return { status: "invalid", fieldErrors: { slug: "slugTaken" } };
    return { status: "error", error: toDomainError(error) };
  };

  if (d.id) {
    const { error } = await db.from("products").update(values).eq("id", d.id);
    if (error) return fail(error);
    await refresh(locale, d.id);
    return { status: "ok" };
  }
  const { data, error } = await db.from("products").insert({ ...values, created_by: user.id }).select("id").single();
  if (error) return fail(error);
  await refresh(locale);
  redirect(`/${locale}/admin/products/${data.id}`);
}

export async function setProductPublished(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(publishProductSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const publish = parsed.data.publish === "true";
  const { error } = await (await createClient())
    .from("products")
    .update({ status: publish ? "published" : "draft", published_at: publish ? new Date().toISOString() : null })
    .eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  await refresh(locale, parsed.data.id);
  return { status: "ok" };
}

export async function deleteProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(productIdSchema, formData);
  if (!parsed.ok) return { status: "error", error: "not_found" };
  const db = await createClient();
  const { data: row } = await db.from("products").select("cover_path, file_path").eq("id", parsed.data.id).maybeSingle();
  const { error } = await db.from("products").delete().eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  if (row?.cover_path) await db.storage.from("content-media").remove([row.cover_path]);
  if (row?.file_path) await db.storage.from("product-files").remove([row.file_path]);
  await refresh(locale);
  return { status: "ok" };
}

// ---------------------------------------------------------------- Subidas
type UploadKind = "cover" | "file";
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: DomainError | "type" | "size" };

const BUCKET = { cover: "content-media", file: "product-files" } as const;

/** Paso 1: ruta y token de subida firmada (solo administración). */
export async function requestProductUpload(input: {
  productId: string;
  kind: UploadKind;
  mime: string;
  size: number;
}): Promise<Result<{ path: string; token: string }>> {
  await requireArea("es", "admin");
  if (!UUID.test(input.productId)) return { ok: false, error: "not_found" };
  const types: readonly string[] = input.kind === "cover" ? PRODUCT_COVER_TYPES : PRODUCT_FILE_TYPES;
  const max = input.kind === "cover" ? PRODUCT_COVER_MAX_BYTES : PRODUCT_FILE_MAX_BYTES;
  const extension = FILE_EXTENSIONS[input.mime];
  if (!extension || !types.includes(input.mime)) return { ok: false, error: "type" };
  if (input.size > max) return { ok: false, error: "size" };

  const db = await createClient();
  const { data } = await db.from("products").select("id").eq("id", input.productId).maybeSingle();
  if (!data) return { ok: false, error: "not_found" };

  const path =
    input.kind === "cover"
      ? `products/${crypto.randomUUID()}.${extension}`
      : `products/${input.productId}/${crypto.randomUUID()}.${extension}`;
  const signed = await db.storage.from(BUCKET[input.kind]).createSignedUploadUrl(path);
  if (signed.error || !signed.data) return { ok: false, error: "unknown" };
  return { ok: true, path, token: signed.data.token };
}

/** Paso 2: comprueba que el archivo existe, lo guarda en el producto y borra el anterior. */
export async function attachProductUpload(input: {
  productId: string;
  kind: UploadKind;
  path: string;
  fileName: string;
  size: number;
  width?: number;
  height?: number;
  locale?: string;
}): Promise<Result> {
  await requireArea("es", "admin");
  if (!UUID.test(input.productId)) return { ok: false, error: "not_found" };
  const pattern =
    input.kind === "cover"
      ? /^products\/[0-9a-f-]{36}\.(png|jpg|webp)$/
      : new RegExp(`^products/${input.productId}/[0-9a-f-]{36}\\.[a-z0-9]{2,5}$`);
  if (!pattern.test(input.path)) return { ok: false, error: "forbidden" };

  const db = await createClient();
  const bucket = BUCKET[input.kind];
  const directory = input.path.slice(0, input.path.lastIndexOf("/"));
  const file = input.path.slice(input.path.lastIndexOf("/") + 1);
  const found = await db.storage.from(bucket).list(directory, { search: file, limit: 1 });
  if (found.error) return { ok: false, error: "unknown" };
  if (!found.data.some((entry) => entry.name === file)) return { ok: false, error: "not_found" };

  const { data: before } = await db.from("products").select("cover_path, file_path").eq("id", input.productId).maybeSingle();
  if (!before) return { ok: false, error: "not_found" };

  const update =
    input.kind === "cover"
      ? { cover_path: input.path, cover_width: input.width ?? null, cover_height: input.height ?? null }
      : { file_path: input.path, file_name: input.fileName.slice(0, 200), file_size_bytes: input.size };
  if (input.kind === "cover" && (!input.width || !input.height)) return { ok: false, error: "type" };
  const { error } = await db.from("products").update(update).eq("id", input.productId);
  if (error) return { ok: false, error: toDomainError(error) };

  const old = input.kind === "cover" ? before.cover_path : before.file_path;
  if (old && old !== input.path) await db.storage.from(bucket).remove([old]);
  await refresh(input.locale === "en" ? "en" : "es", input.productId);
  return { ok: true };
}

/** Quita la portada o el archivo del producto. */
export async function removeProductUpload(input: { productId: string; kind: UploadKind; locale?: string }): Promise<Result> {
  await requireArea("es", "admin");
  if (!UUID.test(input.productId)) return { ok: false, error: "not_found" };
  const db = await createClient();
  const { data: before } = await db.from("products").select("cover_path, file_path").eq("id", input.productId).maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  const update =
    input.kind === "cover"
      ? { cover_path: null, cover_width: null, cover_height: null }
      : { file_path: null, file_name: null, file_size_bytes: null };
  const { error } = await db.from("products").update(update).eq("id", input.productId);
  if (error) return { ok: false, error: toDomainError(error) };
  const old = input.kind === "cover" ? before.cover_path : before.file_path;
  if (old) await db.storage.from(BUCKET[input.kind]).remove([old]);
  await refresh(input.locale === "en" ? "en" : "es", input.productId);
  return { ok: true };
}
