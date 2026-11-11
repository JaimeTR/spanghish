import { getRpc } from "./platform";

/**
 * Próximas ediciones de los programas, leídas del Catálogo del portal por la
 * RPC pública `list_public_editions` (solo ediciones abiertas de programas
 * públicos). Si la plataforma no responde o no hay ninguna, la web enseña su
 * texto de siempre ("pregúntanos por las próximas fechas"): nunca queda vacía.
 */
export type PublicEdition = {
  id: string;
  programCode: string;
  nameEs: string;
  nameEn: string;
  levelCode: string | null;
  durationWeeks: number | null;
  lessonMinutes: number;
  startsOn: string;
  endsOn: string;
  scheduleEs: string | null;
  scheduleEn: string | null;
  enrolUrl: string | null;
  location: { name: string; kind: string; address: string | null; mapUrl: string | null } | null;
  /** Importes en centavos de AUD. */
  upfrontCents: number | null;
  perLessonCents: number | null;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const https = (v: unknown): string | null => {
  const s = text(v);
  if (!s) return null;
  try {
    return new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
};

/** Fila de la RPC → edición; null si le falta algo imprescindible. */
export function parseEdition(row: unknown): PublicEdition | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const id = text(r.edition_id);
  const nameEs = text(r.program_name_es);
  const nameEn = text(r.program_name_en);
  const startsOn = text(r.starts_on);
  const endsOn = text(r.ends_on);
  const lessonMinutes = num(r.lesson_minutes);
  if (!id || !nameEs || !nameEn || !startsOn || !endsOn || lessonMinutes === null) return null;
  if (!DAY.test(startsOn) || !DAY.test(endsOn)) return null;

  const prices = Array.isArray(r.prices) ? (r.prices as Record<string, unknown>[]) : [];
  const priceOf = (kind: string) => {
    const found = prices.find((p) => p && p.kind === kind);
    return found ? num(found.amount_cents) : null;
  };
  const loc = typeof r.location === "object" && r.location !== null ? (r.location as Record<string, unknown>) : null;
  const locName = loc ? text(loc.name) : null;

  return {
    id,
    programCode: text(r.program_code) ?? id,
    nameEs,
    nameEn,
    levelCode: text(r.level_code),
    durationWeeks: num(r.duration_weeks),
    lessonMinutes,
    startsOn,
    endsOn,
    scheduleEs: text(r.schedule_es),
    scheduleEn: text(r.schedule_en),
    enrolUrl: https(r.enrol_url),
    location: loc && locName ? { name: locName, kind: text(loc.kind) ?? "", address: text(loc.address), mapUrl: https(loc.map_url) } : null,
    upfrontCents: priceOf("upfront"),
    perLessonCents: priceOf("per_lesson"),
  };
}

export function parseEditions(data: unknown): PublicEdition[] {
  if (!Array.isArray(data)) return [];
  return data.map(parseEdition).filter((e): e is PublicEdition => e !== null);
}

export async function getPublicEditions(env: Partial<Record<string, string | undefined>> = process.env, fetchImpl: typeof fetch = fetch): Promise<PublicEdition[]> {
  const result = await getRpc<unknown>("list_public_editions", {}, env, fetchImpl);
  return result.ok ? parseEditions(result.data) : [];
}

/** Centavos → "$245" (con decimales solo si los hay). */
export function audFromCents(cents: number): string {
  const value = cents / 100;
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

/** "2026-12-09" → "9 Dec 2026" / "9 dic 2026" (fecha de calendario, sin zona horaria). */
export function formatDay(day: string, locale: "es" | "en"): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale === "es" ? "es-AU" : "en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
