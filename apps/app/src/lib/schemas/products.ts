import { z } from "zod";
import { parseAudToCents } from "../money";

/** Importe en dólares ("2", "2.50") → centavos; error "number" si no vale. */
const dollars = z.string().transform((value, ctx) => {
  const cents = parseAudToCents(value);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "number" });
    return z.NEVER;
  }
  return cents;
});

const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Datos de un producto de la tienda. El precio y el precio tachado se escriben en dólares. */
export const productSchema = z
  .object({
    id: z.uuid().optional(),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60),
    nameEs: z.string().trim().min(1).max(120),
    nameEn: z.string().trim().min(1).max(120),
    summaryEs: optionalText(800),
    summaryEn: optionalText(800),
    price: dollars,
    compareAt: dollars.optional(),
  })
  .superRefine((p, ctx) => {
    if (p.compareAt !== undefined && p.compareAt <= p.price) {
      ctx.addIssue({ code: "custom", path: ["compareAt"], message: "range" });
    }
  });
export type ProductField = keyof z.input<typeof productSchema> & string;

export const productIdSchema = z.object({ id: z.uuid() });
export const publishProductSchema = z.object({ id: z.uuid(), publish: z.enum(["true", "false"]) });

/** Tipos de archivo que se pueden vender (los del bucket product-files). */
export const PRODUCT_FILE_TYPES = [
  "application/pdf",
  "application/zip",
  "image/png",
  "image/jpeg",
  "audio/mpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;
export const PRODUCT_FILE_MAX_BYTES = 26_214_400;
export const PRODUCT_COVER_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const PRODUCT_COVER_MAX_BYTES = 2_097_152;

export const FILE_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/zip": "zip",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
