/**
 * "Mantener la sesión iniciada": si la persona la desmarca al entrar, las cookies
 * de sesión de Supabase dejan de ser persistentes (se borran al cerrar el
 * navegador). La preferencia viaja en una cookie propia, sin datos de la cuenta,
 * para que también la respeten las renovaciones de sesión del proxy y de los
 * Server Components (si no, la primera renovación volvería a hacerla persistente).
 */
export const SESSION_ONLY_COOKIE = "sp_session_only";

type Persistence = { maxAge?: number; expires?: Date | number | string };

/**
 * Opciones de una cookie de sesión de Supabase según la preferencia. Con
 * `sessionOnly` se quitan `maxAge` y `expires` (cookie de sesión del navegador).
 * Las cookies que se están BORRANDO (valor vacío, maxAge 0 o fecha pasada) se
 * dejan intactas: convertirlas en cookies de sesión las dejaría vivas.
 */
export function withSessionPreference<T extends Persistence>(value: string, options: T, sessionOnly: boolean): T {
  if (!sessionOnly || value === "") return options;
  if (options.maxAge !== undefined && options.maxAge <= 0) return options;
  if (options.expires !== undefined && new Date(options.expires).getTime() <= Date.now()) return options;
  const next: Record<string, unknown> = { ...options };
  delete next.maxAge;
  delete next.expires;
  return next as T;
}
