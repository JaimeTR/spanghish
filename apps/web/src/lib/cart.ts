import { isProductId, MAX_ITEMS } from "./shop";

/**
 * Carrito (lógica pura, sin React ni navegador). Guarda solo ids de producto:
 * los precios y nombres salen siempre de lib/shop.ts. Materiales digitales:
 * una unidad por producto, así que "añadir" dos veces no duplica.
 */
export type CartState = { ids: string[] };

export type CartAction =
  | { type: "add"; id: string }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "replace"; ids: readonly string[] };

export const EMPTY_CART: CartState = { ids: [] };

/** Clave de localStorage (versionada por si cambia el formato). */
export const CART_STORAGE_KEY = "spanglish.cart.v1";

/** Ids válidos, sin repetir y como mucho MAX_ITEMS. */
export function sanitizeIds(ids: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (isProductId(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add":
      if (!isProductId(action.id) || state.ids.includes(action.id) || state.ids.length >= MAX_ITEMS) return state;
      return { ids: [...state.ids, action.id] };
    case "remove":
      return state.ids.includes(action.id) ? { ids: state.ids.filter((id) => id !== action.id) } : state;
    case "clear":
      return state.ids.length ? EMPTY_CART : state;
    case "replace": {
      const ids = sanitizeIds(action.ids);
      return ids.length === state.ids.length && ids.every((id, i) => id === state.ids[i]) ? state : { ids };
    }
  }
}

/** Lee el carrito guardado. Cualquier dato roto o ajeno da un carrito vacío. */
export function parseStoredCart(raw: string | null | undefined): CartState {
  if (!raw) return EMPTY_CART;
  try {
    const data: unknown = JSON.parse(raw);
    const ids = typeof data === "object" && data !== null && Array.isArray((data as { ids?: unknown }).ids) ? (data as { ids: unknown[] }).ids : [];
    return { ids: sanitizeIds(ids) };
  } catch {
    return EMPTY_CART;
  }
}

export function serializeCart(state: CartState): string {
  return JSON.stringify({ ids: state.ids });
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** localStorage puede no existir o lanzar (modo privado, cookies bloqueadas): el carrito funciona igual en memoria. */
export function loadCart(storage: StorageLike | undefined): CartState {
  try {
    return parseStoredCart(storage?.getItem(CART_STORAGE_KEY));
  } catch {
    return EMPTY_CART;
  }
}

export function saveCart(storage: StorageLike | undefined, state: CartState): boolean {
  try {
    if (!storage) return false;
    if (state.ids.length) storage.setItem(CART_STORAGE_KEY, serializeCart(state));
    else storage.removeItem(CART_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
