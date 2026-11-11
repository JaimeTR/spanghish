"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { startCheckout, type CheckoutState } from "@/app/[locale]/shop/actions";
import type { Locale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { findProduct, formatAud, subtotalCents } from "@/lib/shop";
import { CONTACT } from "@/lib/site";
import { ArrowIcon } from "../icons";
import { btnInk, btnPrimary } from "../styles";
import { useCart } from "./CartProvider";
import { EmbeddedPayment } from "./EmbeddedPayment";

export function CartIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
    </svg>
  );
}

/**
 * Botón del carrito en la cabecera, con el número de artículos: solo aparece
 * cuando hay algo añadido (entra con una animación suave). Y el panel del carrito: un <dialog> nativo con showModal (foco
 * atrapado, Escape cierra y el foco vuelve al botón).
 */
export function CartButton({ locale }: { locale: Locale }) {
  const t = useTranslations("cart");
  const { ids, open, setOpen } = useCart();
  const count = ids.length;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      {count > 0 && (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={t("button", { count })}
          onClick={() => setOpen(true)}
          className="cart-appear relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-200 hover:bg-ink/8 active:scale-95 motion-reduce:active:scale-100"
        >
          <CartIcon />
          {count > 0 && (
            <span
              key={count}
              aria-hidden="true"
              className="cart-badge absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-fuchsia px-1 text-xs leading-none font-extrabold text-on-primary ring-2 ring-cream"
            >
              {count}
            </span>
          )}
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Clic en el fondo (fuera de la caja): cierra.
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="cart-dialog m-auto w-[min(30rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-7rem)] overflow-visible bg-transparent p-0 text-ink backdrop:bg-ink/55 sm:mt-24 sm:mr-[max(1rem,calc((100%-76rem)/2+2.5rem))]"
      >
        {open && <CartPanel locale={locale} titleId={titleId} onClose={() => setOpen(false)} />}
      </dialog>
    </>
  );
}

/** Precio tachado y precio de oferta; el lector de pantalla oye "Antes $5.00, ahora $2.00". */
export function PriceLine({ priceCents, compareAtCents, className = "" }: { priceCents: number; compareAtCents?: number; className?: string }) {
  const t = useTranslations("shop");
  const price = formatAud(priceCents);
  if (!compareAtCents) return <span className={className}>{price}</span>;
  const was = formatAud(compareAtCents);
  return (
    <span className={className}>
      <span className="sr-only">{t("priceLabel", { was, price })}</span>
      <span aria-hidden="true">
        <s className="text-ink-muted decoration-2">{was}</s> <span className="text-brand-burgundy">{price}</span>
      </span>
    </span>
  );
}

function CartPanel({ locale, titleId, onClose }: { locale: Locale; titleId: string; onClose: () => void }) {
  const t = useTranslations("cart");
  const { ids, remove, products: catalog } = useCart();
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(startCheckout, { status: "idle" });
  // El pago se hace dentro de este modal; "Volver al carrito" lo descarta sin perder el carrito.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const products = ids.map((id) => findProduct(id, catalog)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (state.status === "embedded" && dismissed !== state.clientSecret) {
    const secret = state.clientSecret;
    return (
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col rounded-[1.75rem] border-2 sm:max-h-[calc(100dvh-7rem)] border-ink/10 bg-cream" style={{ filter: "drop-shadow(var(--bubble-shadow))" }}>
        <div className="flex items-center justify-between gap-4 border-b-2 border-ink/10 px-5 py-3 sm:px-6">
          <h2 id={titleId} className="font-display text-[2rem] leading-none text-brand-burgundy">
            {t("payTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-200 hover:bg-ink/8"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-2 py-3 sm:px-3">
          <EmbeddedPayment clientSecret={secret} locale={locale} onDone={onClose} />
        </div>
        <div className="border-t-2 border-ink/10 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setDismissed(secret)}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-ink underline decoration-2 underline-offset-4 transition-colors duration-200 hover:bg-ink/8"
          >
            {t("backToCart")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col rounded-[1.75rem] border-2 sm:max-h-[calc(100dvh-7rem)] border-ink/10 bg-cream" style={{ filter: "drop-shadow(var(--bubble-shadow))" }}>
      <div className="flex items-center justify-between gap-4 border-b-2 border-ink/10 px-5 py-3 sm:px-6">
        <h2 id={titleId} className="font-display text-[2rem] leading-none text-brand-burgundy">
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-200 hover:bg-ink/8"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-4 px-5 py-6 sm:px-6">
          <p className="text-lg">{t("empty")}</p>
          <Link href={localePath(locale, "shop")} onClick={onClose} className={`${btnPrimary} !min-h-11 !px-5 !text-base`}>
            {t("emptyCta")}
            <ArrowIcon />
          </Link>
        </div>
      ) : (
        <>
          <ul aria-label={t("itemsLabel")} className="flex flex-col gap-3 overflow-y-auto px-5 py-4 sm:px-6">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-[1.25rem] bg-surface p-2.5 pr-2 ring-1 ring-ink/10">
                <span className="relative block size-14 shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-ink/10">
                  {p.image ? <Image src={p.image.src} alt="" fill sizes="3.5rem" unoptimized={p.image.src.startsWith("http")} className="object-contain" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug font-extrabold" lang={locale === "es" ? p.nameLang : undefined}>
                    {p.name[locale]}
                  </span>
                  <PriceLine priceCents={p.priceCents} compareAtCents={p.compareAtCents} className="mt-0.5 block font-semibold" />
                </span>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={t("removeLabel", { name: p.name[locale] })}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-bold text-ink underline decoration-2 underline-offset-4 transition-colors duration-200 hover:bg-ink/8"
                >
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t-2 border-ink/10 px-5 pt-4 pb-5 sm:px-6">
            <p className="flex items-baseline justify-between gap-4 text-lg">
              <span className="font-bold">{t("subtotal")}</span>
              <span data-testid="cart-subtotal" className="font-display text-[1.75rem] leading-none text-brand-burgundy">
                {formatAud(subtotalCents(ids, catalog))} <span className="font-sans text-base font-bold text-ink">AUD</span>
              </span>
            </p>
            <p className="mt-1 text-sm text-ink-muted">{t("currencyNote")}</p>

            <form action={formAction} className="mt-4">
              <input type="hidden" name="locale" value={locale} />
              {ids.map((id) => (
                <input key={id} type="hidden" name="id" value={id} />
              ))}
              <div className="flex flex-col gap-2">
                <Link href={localePath(locale, "shopCheckout")} onClick={onClose} className={`${btnPrimary} w-full`}>
                  {t("goCheckout")}
                  <ArrowIcon />
                </Link>
                <button type="submit" disabled={pending} className={`${btnInk} w-full disabled:cursor-progress disabled:opacity-80`}>
                  {pending ? t("pending") : t("checkout")}
                </button>
              </div>
            </form>

            {state.status !== "idle" && state.status !== "embedded" && !pending ? (
              <div role="alert" className="mt-4 rounded-[1.25rem] border-2 border-brand-burgundy bg-surface px-4 py-3">
                <p className="font-bold text-ink">{t(state.status)}</p>
                <p className="mt-1 text-ink">{t("contactLead")}</p>
                <p className="mt-1 flex flex-col">
                  <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-11 items-center font-bold text-brand-burgundy underline decoration-2 underline-offset-4 [overflow-wrap:anywhere]">
                    {CONTACT.email}
                  </a>
                  <a href={`tel:${CONTACT.phoneE164}`} className="inline-flex min-h-11 items-center font-bold text-brand-burgundy underline decoration-2 underline-offset-4">
                    {CONTACT.phoneDisplay}
                  </a>
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {t("stripeNote")} {t("deliveryNote")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
