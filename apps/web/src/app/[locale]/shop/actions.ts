"use server";

import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { createCheckoutSession } from "@/lib/checkout";

export type CheckoutState = { status: "idle" } | { status: "invalid" | "unavailable" | "failed" };

/**
 * "Ir a pagar" del carrito. Del navegador solo llegan ids (campo `id`, uno por
 * producto); precios y nombres los pone el servidor (lib/checkout.ts). Si la
 * sesión se crea, redirige a la página de pago de Stripe; si no, devuelve el
 * motivo y el carrito lo muestra (nunca se finge un pago).
 */
export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !isLocale(locale)) return { status: "invalid" };

  const result = await createCheckoutSession(formData.getAll("id"), locale);
  if (!result.ok) return { status: result.reason };

  redirect(result.url);
}
