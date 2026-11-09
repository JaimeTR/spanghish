import type { Locale } from "../i18n/routing";

/**
 * Hora escolar: Australia/Brisbane (Queensland no tiene horario de verano, así
 * que el offset es siempre +10:00). "Hoy", los días del calendario y los rangos
 * de consulta se calculan aquí, nunca en UTC ni en la zona del servidor.
 * Un día es una cadena `YYYY-MM-DD`; los instantes son ISO UTC.
 */
export const SCHOOL_TIME_ZONE = "Australia/Brisbane";
const SCHOOL_OFFSET = "+10:00";

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDay(day: string): Date {
  const m = DAY.exec(day);
  if (!m) throw new RangeError(`Día inválido: ${day}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    throw new RangeError(`Día inválido: ${day}`);
  }
  return date;
}

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Día escolar (Brisbane) del instante dado. */
export function schoolToday(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/** Instantes UTC `[from, to)` que cubren el día escolar indicado. */
export function schoolDayRange(day: string): { from: string; to: string } {
  parseDay(day);
  return {
    from: new Date(`${day}T00:00:00${SCHOOL_OFFSET}`).toISOString(),
    to: new Date(`${addDays(day, 1)}T00:00:00${SCHOOL_OFFSET}`).toISOString(),
  };
}

export function addDays(day: string, n: number): string {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + n);
  return toDay(date);
}

/** Lunes (ISO) de la semana del día dado. */
export function weekStart(day: string): string {
  const dow = parseDay(day).getUTCDay(); // 0 = domingo
  return addDays(day, -((dow + 6) % 7));
}

const timeFormatters = new Map<Locale, Intl.DateTimeFormat>();

/** "7:00–8:10" (es) / "6:00 – 7:10 pm" (en), en hora de Brisbane. */
export function formatSessionTime(startsAt: string, endsAt: string, locale: Locale): string {
  let fmt = timeFormatters.get(locale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-AU", {
      timeZone: SCHOOL_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
    timeFormatters.set(locale, fmt);
  }
  return fmt.formatRange(new Date(startsAt), new Date(endsAt));
}

/**
 * Fecha de calendario (`YYYY-MM-DD`, columnas `date`) para mostrar: "1 feb 2027"
 * / "1 Feb 2027". Se formatea en UTC porque el día no es un instante: así nunca
 * se corre un día según la zona del servidor o del navegador.
 */
export function formatDay(day: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-AU", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDay(day));
}

/** Fecha y hora de un instante en hora de Brisbane: "9 nov 2026, 14:05". */
export function formatInstant(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-AU", {
    timeZone: SCHOOL_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
