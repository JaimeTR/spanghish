"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { Locale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";

/**
 * Formulario de pago de Stripe DENTRO de la web (Embedded Checkout), para
 * montarlo en el modal del carrito: la persona no sale de la página. Los datos
 * de la tarjeta los recoge Stripe en su propio iframe, nunca este código.
 * Al terminar, lleva a la página de confirmación (donde están las descargas).
 */
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

/** "cs_test_…_secret_…" → "cs_test_…" (el id de la sesión va antes de "_secret_"). */
export function sessionIdFromSecret(clientSecret: string): string {
  return clientSecret.split("_secret_")[0] ?? clientSecret;
}

export function EmbeddedPayment({ clientSecret, locale, onDone }: { clientSecret: string; locale: Locale; onDone: () => void }) {
  const router = useRouter();
  const stripe = getStripe();
  const options = useMemo(
    () => ({
      clientSecret,
      onComplete: () => {
        onDone();
        router.push(`${localePath(locale, "shopSuccess")}?session_id=${sessionIdFromSecret(clientSecret)}`);
      },
    }),
    // onDone/router cambian de identidad en cada render; la sesión de Stripe solo depende del secreto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientSecret, locale],
  );

  if (!stripe) return null;
  return (
    <EmbeddedCheckoutProvider stripe={stripe} options={options}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
