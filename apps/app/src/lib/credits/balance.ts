/** Cálculos del saldo de packs de clases (sin acceso a datos: se prueban solos). */
/** Las columnas de la vista pueden venir null en los tipos generados: null cuenta como 0. */
export type PackBalance = { remaining: number | null; voided_at: string | null; is_expired: boolean | null };

/** Un pack se puede usar si no está anulado ni caducado. */
export function isUsable(pack: PackBalance): boolean {
  return pack.voided_at === null && !pack.is_expired;
}

/** Clases disponibles: suma del saldo de los packs usables (nunca negativo). */
export function availableLessons(packs: readonly PackBalance[]): number {
  return packs.filter(isUsable).reduce((sum, p) => sum + Math.max(0, p.remaining ?? 0), 0);
}
