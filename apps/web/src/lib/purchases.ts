export type PurchaseItem = { id: string; slug: string; name: string; amountCents: number; fileName: string | null; hasFile: boolean };
export type Purchase = { id: string; createdAt: string; totalCents: number; currency: string; items: PurchaseItem[] };

/** Convierte la respuesta de `my_shop_purchases()` en datos seguros; ignora lo que no encaja. */
export function parsePurchases(data: unknown): Purchase[] {
  if (!Array.isArray(data)) return [];
  const out: Purchase[] = [];
  for (const row of data) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.order_id !== "string" || typeof r.created_at !== "string" || typeof r.total_cents !== "number") continue;
    const items: PurchaseItem[] = [];
    for (const it of Array.isArray(r.items) ? r.items : []) {
      if (typeof it !== "object" || it === null) continue;
      const i = it as Record<string, unknown>;
      if (typeof i.item_id !== "string" || typeof i.name !== "string") continue;
      items.push({
        id: i.item_id,
        slug: typeof i.slug === "string" ? i.slug : "",
        name: i.name,
        amountCents: typeof i.amount_cents === "number" ? i.amount_cents : 0,
        fileName: typeof i.file_name === "string" ? i.file_name : null,
        hasFile: typeof i.file_path === "string" && i.file_path.length > 0,
      });
    }
    out.push({ id: r.order_id, createdAt: r.created_at, totalCents: r.total_cents, currency: typeof r.currency === "string" ? r.currency : "aud", items });
  }
  return out;
}
