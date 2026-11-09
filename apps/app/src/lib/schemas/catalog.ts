import { z } from "zod";

/** Casilla de formulario: "on" si está marcada; ausente si no. */
export const checkbox = z
  .literal("on")
  .optional()
  .transform((v) => v === "on");

export const AUDIENCES = ["kids", "adults", "mature"] as const;
export const FORMATS = ["individual", "own_group", "local_group"] as const;
export const LOCATION_KINDS = ["library", "office", "home", "online"] as const;
export const REGIONS = ["sunshine_coast", "brisbane", "online"] as const;
export const EDITION_STATUSES = ["draft", "open", "closed", "cancelled"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Sede. Sin dirección para domicilio u online (la BD lo exige también). */
export const locationSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1).max(120),
    kind: z.enum(LOCATION_KINDS),
    region: z.enum(REGIONS),
    address: optionalText(300),
    mapUrl: z.url({ protocol: /^https$/ }).max(500).optional(),
    active: checkbox,
  })
  .superRefine((d, ctx) => {
    if ((d.kind === "home" || d.kind === "online") && d.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "invalid" });
    }
  });
export type LocationInput = z.infer<typeof locationSchema>;

export const programSchema = z.object({
  id: z.uuid().optional(),
  code: z.string().trim().regex(/^[a-z0-9-]{2,40}$/),
  nameEs: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  descriptionEs: optionalText(2000),
  descriptionEn: optionalText(2000),
  languageCode: z.string().regex(/^[a-z]{2}$/),
  audience: z.enum(AUDIENCES),
  format: z.enum(FORMATS),
  levelId: z.uuid().optional(),
  durationWeeks: z.coerce.number().int().min(1).max(52).optional(),
  lessonMinutes: z.coerce.number().int().min(15).max(240),
  active: checkbox,
  isPublic: checkbox,
});
export type ProgramInput = z.infer<typeof programSchema>;

export const editionSchema = z
  .object({
    id: z.uuid().optional(),
    programId: z.uuid(),
    labelEs: optionalText(120),
    labelEn: optionalText(120),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    status: z.enum(EDITION_STATUSES),
  })
  .superRefine((d, ctx) => {
    // Fechas ISO (AAAA-MM-DD): el orden de texto es el orden de calendario.
    if (d.endsOn < d.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "range" });
  });
export type EditionInput = z.infer<typeof editionSchema>;
