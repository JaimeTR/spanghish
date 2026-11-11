"use server";

import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { createCheckoutSession } from "@/lib/checkout";

export type CheckoutState =
  | { status: "idle" }
  | { status: "invalid" | "unavailable" | "failed" }
  /** Pago dentro de la web: el carrito monta el formulario de Stripe con este secreto. */
  | { status: "embedded"; clientSecret: string };

/**
 * "Ir a pagar" del carrito. Del navegador solo llegan ids (campo `id`, uno por
 * producto); precios y nombres los pone el servidor (lib/checkout.ts). Con la
 * clave publicable de Stripe configurada, el pago se hace dentro de la web
 * (modal del carrito); sin ella, se redirige a la página de pago de Stripe. Si
 * la sesión no se puede crear, devuelve el motivo (nunca se finge un pago).
 */
export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !isLocale(locale)) return { status: "invalid" };

  const embedded = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
  const result = await createCheckoutSession(formData.getAll("id"), locale, undefined, undefined, undefined, embedded);
  if (!result.ok) return { status: result.reason };
  if ("clientSecret" in result) return { status: "embedded", clientSecret: result.clientSecret };

  redirect(result.url);
}
