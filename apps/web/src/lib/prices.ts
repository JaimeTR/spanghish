/**
 * Precios publicados en spanglish.com.au, en AUD. Única fuente de las cifras:
 * los textos de messages/ usan marcadores ({groupFrom}, {matureLesson}...) que
 * se rellenan con PRICE_VALUES, y el JSON-LD lee los números de aquí.
 * Un test impide escribir cifras con "$" directamente en messages/.
 *
 * Origen (web actual):
 * - groupFrom: /adult-lessons y /kids-lessons ("Group rates start from $30 per person").
 * - mature*: /mature-lessons (desde abril de 2026).
 * - online*: home, "10-week online conversation" ($245 por adelantado o $25 por clase).
 * - sixWeek / nineWeek / editionLesson: home, ediciones de grupo para principiantes
 *   ($205 y $310 por adelantado, o $35 por clase). Las fechas no se publican aquí
 *   porque caducan: se invita a preguntar por las próximas.
 */
export const PRICES = {
  free: 0,
  groupFrom: 30,
  matureLesson: 40,
  matureUpfront: 390,
  matureSingle: 45,
  onlineUpfront: 245,
  onlineLesson: 25,
  nineWeekUpfront: 310,
  sixWeekUpfront: 205,
  editionLesson: 35,
} as const;

export type PriceName = keyof typeof PRICES;

/** "$30": mismo formato en ambos idiomas (es el que usa la web publicada). */
export function aud(amount: number): string {
  return `$${amount}`;
}

/** Valores para los marcadores de precio de messages/ (`{groupFrom}` -> "$30"). */
export const PRICE_VALUES = Object.fromEntries(
  (Object.keys(PRICES) as PriceName[]).map((k) => [k, aud(PRICES[k])]),
) as Record<PriceName, string>;
