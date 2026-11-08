import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { PRODUCTS } from "@/lib/shop";
import { ArrowIcon } from "../icons";
import { PriceLine } from "./CartButton";
import { SaleBadge } from "./ProductCard";

/**
 * Vista previa de los materiales (en /resources): cada tarjeta lleva a la
 * tienda, donde se añaden al carrito.
 */
export function ProductPreviews({ locale }: { locale: Locale }) {
  const t = useTranslations("shop");

  return (
    <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((p) => (
        <li key={p.id}>
          <Link
            href={`${localePath(locale, "shop")}#product-${p.id}`}
            className="group flex h-full flex-col rounded-[1.75rem] bg-surface p-3 text-ink no-underline ring-2 ring-ink/10 transition-transform duration-300 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="relative block aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-cream">
              {p.compareAtCents && <SaleBadge label={t("sale")} />}
              <Image src={p.image.src} alt={t(`products.${p.copyKey}.alt`)} fill sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw" className="object-contain p-2" />
            </span>
            <span className="flex flex-1 flex-col px-2 pt-4 pb-2">
              <span className="font-display text-2xl leading-tight decoration-[3px] group-hover:underline" lang={locale === "es" ? p.nameLang : undefined}>
                {p.name[locale]}
              </span>
              <span className="mt-3 flex items-center justify-between gap-3">
                <PriceLine priceCents={p.priceCents} compareAtCents={p.compareAtCents} className="font-display text-[1.75rem] leading-none [&_s]:font-sans [&_s]:text-lg [&_s]:font-bold" />
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full ring-2 ring-ink/20 transition-colors duration-200 group-hover:bg-ink/8">
                  <ArrowIcon />
                </span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
