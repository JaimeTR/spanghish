import type { Tables } from "@spanglish/db";

export type PriceRow = Tables<"program_prices">;
export type PriceContext = { programId: string; editionId: string | null; locationId: string | null };

const KIND_ORDER: Record<PriceRow["kind"], number> = { per_lesson: 0, upfront: 1, pack: 2 };

/** Más específico gana: edición+sede (3) > edición (2) > sede (1) > programa (0). */
function specificity(p: PriceRow): number {
  return (p.edition_id ? 2 : 0) + (p.location_id ? 1 : 0);
}

/**
 * Precios que aplican a un contexto (programa, edición y sede): entre los
 * activos que encajan, uno por (kind, lessons_included), el más específico.
 * Un precio de edición o de sede solo aplica a esa edición o sede. Sin BD.
 * Orden: por clase, pago único y packs de menos a más clases.
 */
export function resolvePrices(prices: PriceRow[], ctx: PriceContext): PriceRow[] {
  const best = new Map<string, PriceRow>();
  for (const p of prices) {
    if (!p.active || p.program_id !== ctx.programId) continue;
    if (p.edition_id !== null && p.edition_id !== ctx.editionId) continue;
    if (p.location_id !== null && p.location_id !== ctx.locationId) continue;
    const key = `${p.kind}:${p.lessons_included ?? ""}`;
    const current = best.get(key);
    if (!current || specificity(p) > specificity(current)) best.set(key, p);
  }
  return [...best.values()].sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.lessons_included ?? 0) - (b.lessons_included ?? 0),
  );
}
