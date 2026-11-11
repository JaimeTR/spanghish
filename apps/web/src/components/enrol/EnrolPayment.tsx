"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useActionState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { chooseTransfer, startEnrolPayment, type PayState } from "@/app/[locale]/enrol/actions";
import type { Locale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";
import { btnInk, btnPrimary } from "../styles";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

function CardCheckout({ clientSecret, locale, token }: { clientSecret: string; locale: Locale; token: string }) {
  const router = useRouter();
  const stripe = getStripe();
  const options = useMemo(
    () => ({
      clientSecret,
      onComplete: () => {
        const sessionId = clientSecret.split("_secret_")[0] ?? clientSecret;
        router.push(`${localePath(locale, "enrolSuccess")}?session_id=${sessionId}&t=${token}`);
      },
    }),
    // router cambia de identidad en cada render; la sesión de Stripe solo depende del secreto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientSecret, locale, token],
  );
  if (!stripe) return null;
  return (
    <EmbeddedCheckoutProvider stripe={stripe} options={options}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}

/**
 * Pago de una reserva viva: tarjeta (Stripe dentro de la web; los datos de la tarjeta los
 * recoge Stripe en su iframe) o transferencia (la plaza se retiene 5 días).
 */
export function EnrolPayment({
  locale,
  token,
  amount,
  method,
  email,
  reference,
}: {
  locale: Locale;
  token: string;
  amount: string;
  method: "stripe" | "transfer";
  email: string;
  reference: string;
}) {
  const t = useTranslations("enrol.pay");
  const [state, formAction, pending] = useActionState<PayState, FormData>(startEnrolPayment, { status: "idle" });

  if (state.status === "embedded") {
    return (
      <section aria-labelledby="enrol-card" className="rounded-[1.75rem] border-2 border-ink/10 bg-cream p-3 sm:p-5">
        <h2 id="enrol-card" className="px-2 font-display text-[1.75rem] leading-none text-brand-burgundy">
          {t("cardTitle")}
        </h2>
        <div className="mt-3">
          <CardCheckout clientSecret={state.clientSecret} locale={locale} token={token} />
        </div>
      </section>
    );
  }

  const failed = state.status !== "idle" && !pending ? state.status : null;
  return (
    <div className="flex flex-col gap-6">
      {method === "transfer" && (
        <div role="status" className="rounded-[1.75rem] border-2 border-brand-purple bg-surface p-5 text-lg leading-relaxed text-ink sm:p-6">
          <p>{t("transferChosen", { email, reference })}</p>
          <p className="mt-3 text-base text-ink-muted">{t("transferSwitch")}</p>
        </div>
      )}

      <section aria-labelledby="enrol-card" className="rounded-[1.75rem] border-2 border-ink/10 bg-surface p-5 sm:p-6">
        <h2 id="enrol-card" className="font-display text-[1.75rem] leading-none text-brand-burgundy">
          {t("cardTitle")}
        </h2>
        <p className="mt-2 text-ink">{t("cardLead")}</p>
        <form action={formAction} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={token} />
          <button type="submit" disabled={pending} className={`${btnPrimary} w-full cursor-pointer disabled:cursor-progress disabled:opacity-80 sm:w-auto`}>
            {pending ? t("cardPending") : t("cardButton", { amount })}
          </button>
        </form>
        {failed ? (
          <div role="alert" className="mt-4 rounded-[1.25rem] border-2 border-brand-burgundy bg-cream px-4 py-3">
            <p className="font-bold text-ink">{t(`error.${failed}`)}</p>
            <p className="mt-1 text-ink">
              <a href={`mailto:${CONTACT.email}`} className="font-bold text-brand-burgundy underline decoration-2 underline-offset-4 [overflow-wrap:anywhere]">
                {CONTACT.email}
              </a>
            </p>
          </div>
        ) : null}
      </section>

      {method !== "transfer" && (
        <section aria-labelledby="enrol-transfer" className="rounded-[1.75rem] border-2 border-ink/10 bg-surface p-5 sm:p-6">
          <h2 id="enrol-transfer" className="font-display text-[1.75rem] leading-none text-brand-burgundy">
            {t("transferTitle")}
          </h2>
          <p className="mt-2 text-ink">{t("transferLead")}</p>
          <form action={chooseTransfer} className="mt-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="token" value={token} />
            <button type="submit" className={`${btnInk} cursor-pointer`}>
              {t("transferButton")}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
