"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { startCheckout, type CheckoutState } from "@/app/[locale]/shop/actions";
import type { Locale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { findProduct, formatAud, subtotalCents } from "@/lib/shop";
import { CONTACT } from "@/lib/site";
import { btnInk, btnPrimary } from "../styles";
import { useCart } from "./CartProvider";
import { EmbeddedPayment } from "./EmbeddedPayment";

/** Página de checkout: resumen del carrito a la izquierda y el pago de Stripe (dentro de la web) a la derecha. */
export function CheckoutView({ locale }: { locale: Locale }) {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const { ids, ready, remove, products: catalog } = useCart();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(startCheckout, { status: "idle" });
  const products = ids.map((id) => findProduct(id, catalog)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const paying = state.status === "embedded";

  if (!ready) return <p className="py-10 text-lg text-ink">{t("loading")}</p>;
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-6">
        <p className="text-lg text-ink">{tc("empty")}</p>
        <Link href={localePath(locale, "shop")} className={btnPrimary}>
          {tc("emptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      <section aria-labelledby="checkout-summary" className="rounded-[1.75rem] border-2 border-ink/10 bg-surface p-5 sm:p-6">
        <h2 id="checkout-summary" className="font-display text-[1.75rem] leading-none text-brand-burgundy">
          {t("summary")}
        </h2>
        <ul aria-label={tc("itemsLabel")} className="mt-4 flex flex-col gap-3">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-cream ring-1 ring-ink/10">
                {p.image ? <Image src={p.image.src} alt="" fill sizes="3.5rem" unoptimized={p.image.src.startsWith("http")} className="object-contain" /> : null}
              </span>
              <span className="min-w-0 flex-1 leading-snug font-extrabold" lang={locale === "es" ? p.nameLang : undefined}>
                {p.name[locale]}
              </span>
              <span className="font-semibold">{formatAud(p.priceCents)}</span>
              {!paying ? (
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={tc("removeLabel", { name: p.name[locale] })}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-bold text-ink underline decoration-2 underline-offset-4 hover:bg-ink/8"
                >
                  {tc("remove")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-5 flex items-baseline justify-between gap-4 border-t-2 border-ink/10 pt-4 text-lg">
          <span className="font-bold">{t("total")}</span>
          <span className="font-display text-[1.75rem] leading-none text-brand-burgundy">
            {formatAud(subtotalCents(ids, catalog))} <span className="font-sans text-base font-bold text-ink">AUD</span>
          </span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">{tc("currencyNote")}</p>
        <ul className="mt-4 flex flex-col gap-1 text-sm text-ink">
          <li>✓ {t("secure")}</li>
          <li>✓ {t("instant")}</li>
          <li>✓ {t("receipt")}</li>
        </ul>
      </section>

      <section aria-labelledby="checkout-pay" className="rounded-[1.75rem] border-2 border-ink/10 bg-cream p-3 sm:p-5">
        <h2 id="checkout-pay" className="px-2 font-display text-[1.75rem] leading-none text-brand-burgundy">
          {t("pay")}
        </h2>
        {paying ? (
          <div className="mt-3">
            <EmbeddedPayment clientSecret={state.clientSecret} locale={locale} onDone={() => {}} />
          </div>
        ) : (
          <form action={formAction} className="mt-3 px-2 pb-2">
            <input type="hidden" name="locale" value={locale} />
            {ids.map((id) => (
              <input key={id} type="hidden" name="id" value={id} />
            ))}
            <p className="mb-4 text-ink">{t("payLead")}</p>
            <button type="submit" disabled={pending} className={`${btnPrimary} w-full disabled:cursor-progress disabled:opacity-80`}>
              {pending ? tc("pending") : t("continue")}
            </button>
            {state.status !== "idle" && !pending ? (
              <div role="alert" className="mt-4 rounded-[1.25rem] border-2 border-brand-burgundy bg-surface px-4 py-3">
                <p className="font-bold text-ink">{tc(state.status)}</p>
                <p className="mt-1 text-ink">
                  {tc("contactLead")}{" "}
                  <a href={`mailto:${CONTACT.email}`} className="font-bold text-brand-burgundy underline decoration-2 underline-offset-4 [overflow-wrap:anywhere]">
                    {CONTACT.email}
                  </a>
                </p>
              </div>
            ) : null}
          </form>
        )}
        <p className="mt-3 px-2">
          <Link href={localePath(locale, "shop")} className={`${btnInk} !min-h-11 !px-4 !text-base`}>
            {t("keepShopping")}
          </Link>
        </p>
      </section>
    </div>
  );
}
