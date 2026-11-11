import type { ReactNode } from "react";
import { getShopProducts } from "@/lib/shop-source";
import { CartProvider } from "./CartProvider";

/**
 * Carrito con los productos a la venta. Es un componente de servidor: lee la
 * lista (con caché de unos minutos) y se la pasa al carrito del navegador.
 */
export async function ShopCartProvider({ children }: { children: ReactNode }) {
  const products = await getShopProducts();
  return <CartProvider products={products}>{children}</CartProvider>;
}
