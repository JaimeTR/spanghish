/**
 * Importes en AUD como centavos enteros (columna `amount_cents`).
 * Formato igual que la web pública (apps/web, `aud()`): "$205", sin separador
 * de miles y con céntimos solo si los hay ("$205.50"), en ambos idiomas.
 */
const MAX_DOLLARS = 100_000;
const AMOUNT = /^(\d{1,6})(?:\.(\d{1,2}))?$/;

/** "205", "205.5" o "205.50" → centavos; null si es negativo, tiene >2 decimales o pasa de 100000. */
export function parseAudToCents(input: string): number | null {
  const m = AMOUNT.exec(input.trim());
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return cents <= MAX_DOLLARS * 100 ? cents : null;
}

export function formatAud(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const rest = Math.abs(cents % 100);
  const sign = cents < 0 ? "-" : "";
  return rest === 0
    ? `${sign}$${Math.abs(dollars)}`
    : `${sign}$${Math.abs(dollars)}.${String(rest).padStart(2, "0")}`;
}
