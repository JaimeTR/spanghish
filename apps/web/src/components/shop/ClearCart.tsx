"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

/** Vacía el carrito al confirmar Stripe el pago (página de éxito). */
export function ClearCart() {
  const { ready, clear } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
