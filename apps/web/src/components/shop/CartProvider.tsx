"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { CART_STORAGE_KEY, cartReducer, loadCart, parseStoredCart, saveCart, type CartAction, type CartState } from "@/lib/cart";
import type { Product } from "@/lib/shop";

type CartContextValue = {
  ids: string[];
  /** Productos a la venta (de la base de datos, o la lista fija si no responde). */
  products: readonly Product[];
  /** true tras leer localStorage (antes, el carrito se muestra vacío). */
  ready: boolean;
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Abre el panel del carrito (lo pinta CartButton en la cabecera). */
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

type ProviderState = CartState & { ready: boolean };

/** El reducer puro del carrito más "hydrate": el estado leído de localStorage al montar. */
function providerReducer(
  state: ProviderState,
  action: CartAction | { type: "hydrate"; ids: readonly string[] },
  products: readonly Product[],
): ProviderState {
  if (action.type === "hydrate") return { ...cartReducer(state, { type: "replace", ids: action.ids }, products), ready: true };
  const next = cartReducer(state, action, products);
  return next === state ? state : { ...next, ready: state.ready };
}

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Estado del carrito en el navegador. Se guarda en localStorage (si se puede:
 * en modo privado o con el almacenamiento bloqueado funciona solo en memoria) y
 * se sincroniza entre pestañas.
 */
export function CartProvider({ children, products }: { children: ReactNode; products: readonly Product[] }) {
  const reducer = useMemo(
    () => (s: ProviderState, a: CartAction | { type: "hydrate"; ids: readonly string[] }) => providerReducer(s, a, products),
    [products],
  );
  const [state, dispatch] = useReducer(reducer, { ids: [], ready: false });
  const [open, setOpen] = useState(false);
  const { ready } = state;

  useEffect(() => {
    dispatch({ type: "hydrate", ids: loadCart(storage(), products).ids });
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY || e.key === null) dispatch({ type: "replace", ids: parseStoredCart(e.newValue, products).ids });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [products]);

  // Solo tras leer lo guardado (si no, el carrito vacío inicial lo borraría).
  useEffect(() => {
    if (ready) saveCart(storage(), { ids: state.ids });
  }, [ready, state.ids]);

  const add = useCallback((id: string) => dispatch({ type: "add", id }), []);
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo<CartContextValue>(
    () => ({ ids: state.ids, products, ready, has: (id) => state.ids.includes(id), add, remove, clear, open, setOpen }),
    [state.ids, products, ready, add, remove, clear, open],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fuera de CartProvider");
  return ctx;
}
