import { timingSafeEqual } from "node:crypto";

/** Longitud mínima del secreto compartido: uno corto se trata como no configurado. */
export const MIN_REVALIDATE_SECRET = 32;

export function hasRevalidateSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= MIN_REVALIDATE_SECRET;
}

/**
 * ¿La petición trae el secreto compartido en `Authorization: Bearer`?
 * Comparación en tiempo constante; sin secreto (o demasiado corto), siempre false.
 */
export function isAuthorizedRevalidate(header: string | null | undefined, secret: string | undefined): boolean {
  if (!hasRevalidateSecret(secret) || !header) return false;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  const given = Buffer.from(match[1]!);
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
