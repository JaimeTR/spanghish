"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { CART_STORAGE_KEY, cartReducer, loadCart, parseStoredCart, saveCart, type CartAction, type CartState } from "@/lib/cart";

type CartContextValue = {
  ids: string[];
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
function providerReducer(state: ProviderState, action: CartAction | { type: "hydrate"; ids: readonly string[] }): ProviderState {
  if (action.type === "hydrate") return { ...cartReducer(state, { type: "replace", ids: action.ids }), ready: true };
  const next = cartReducer(state, action);
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
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(providerReducer, { ids: [], ready: false });
  const [open, setOpen] = useState(false);
  const { ready } = state;

  useEffect(() => {
    dispatch({ type: "hydrate", ids: loadCart(storage()).ids });
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY || e.key === null) dispatch({ type: "replace", ids: parseStoredCart(e.newValue).ids });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Solo tras leer lo guardado (si no, el carrito vacío inicial lo borraría).
  useEffect(() => {
    if (ready) saveCart(storage(), { ids: state.ids });
  }, [ready, state.ids]);

  const add = useCallback((id: string) => dispatch({ type: "add", id }), []);
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo<CartContextValue>(
    () => ({ ids: state.ids, ready, has: (id) => state.ids.includes(id), add, remove, clear, open, setOpen }),
    [state.ids, ready, add, remove, clear, open],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fuera de CartProvider");
  return ctx;
}
