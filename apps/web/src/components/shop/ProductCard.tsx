"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Product } from "@/lib/shop";
import { PriceLine } from "./CartButton";
import { useCart } from "./CartProvider";

/** Pegatina "¡Oferta!": un bocadillo fucsia ladeado sobre la imagen. */
export function SaleBadge({ label }: { label: string }) {
  return (
    <span className="absolute top-3 left-3 z-10 -rotate-6 rounded-full bg-brand-fuchsia px-3.5 py-1.5 font-display text-lg leading-none text-on-primary shadow-[3px_3px_0_var(--brand-burgundy)]">
      {label}
    </span>
  );
}

/**
 * Tarjeta de producto de la tienda: imagen, nombre, precio de oferta y
 * "Añadir al carrito". Una unidad por producto: una vez añadido, el botón pasa
 * a "En el carrito" y abre el carrito.
 */
export function ProductCard({ product, locale, headingLevel = 3 }: { product: Product; locale: Locale; headingLevel?: 2 | 3 }) {
  const t = useTranslations("shop");
  const { has, add, ready, setOpen } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = ready && has(product.id);
  const name = product.name[locale];
  const titleId = `product-${product.id}`;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article aria-labelledby={titleId} className="group flex w-full flex-col">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-surface ring-2 ring-ink/10 transition-transform duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        {product.compareAtCents && <SaleBadge label={t("sale")} />}
        <div className="relative aspect-[4/3]">
          <Image
            src={product.image.src}
            alt={t(`products.${product.copyKey}.alt`)}
            fill
            sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
            className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        <p className="text-sm font-bold tracking-wide text-brand-purple uppercase">{t("type")}</p>
        <Heading id={titleId} className="mt-1 font-display text-[1.75rem] leading-[1.1] text-ink" lang={locale === "es" ? product.nameLang : undefined}>
          {name}
        </Heading>
        <p className="mt-2 flex-1 leading-relaxed text-ink">{t(`products.${product.copyKey}.summary`)}</p>
        <PriceLine
          priceCents={product.priceCents}
          compareAtCents={product.compareAtCents}
          className="mt-4 block font-display text-[2rem] leading-none [&_s]:font-sans [&_s]:text-xl [&_s]:font-bold"
        />

        <div className="mt-5">
          {/* Un único botón (el foco no se pierde al añadir): "Añadir" y, ya en el carrito, "Ver el carrito". */}
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              if (inCart) return setOpen(true);
              add(product.id);
              setJustAdded(true);
            }}
            aria-describedby={titleId}
            className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[1.0625rem] font-bold transition-[transform,box-shadow,background-color] duration-150 ease-out active:translate-y-[5px] active:shadow-[0_0_0_var(--brand-burgundy)] disabled:cursor-wait motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0 ${
              inCart
                ? `bg-brand-yellow text-ink shadow-[0_5px_0_var(--brand-burgundy)] hover:-translate-y-0.5 hover:shadow-[0_7px_0_var(--brand-burgundy)] ${justAdded ? "add-pop" : ""}`
                : "bg-primary text-on-primary shadow-[0_5px_0_var(--brand-burgundy)] hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_7px_0_var(--brand-burgundy)]"
            }`}
          >
            {inCart ? (
              <>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10.5l4 4 8-9" />
                </svg>
                {t("added")}
                <span className="font-semibold underline decoration-2 underline-offset-4">· {t("viewCart")}</span>
              </>
            ) : (
              <>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <path d="M10 4v12M4 10h12" />
                </svg>
                {t("add")}
              </>
            )}
          </button>
          <p aria-live="polite" className="sr-only">
            {justAdded && inCart ? t("addedLabel", { name }) : ""}
          </p>
        </div>
      </div>
    </article>
  );
}
