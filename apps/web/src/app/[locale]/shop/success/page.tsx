import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { ClearCart } from "@/components/shop/ClearCart";
import { btnInk, btnPrimary, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { paymentStatus, receiptUrlOf, retrievePaidSession } from "@/lib/checkout";
import { recordShopOrder } from "@/lib/shop-orders";
import { findProduct, formatAud } from "@/lib/shop";
import { getShopProducts } from "@/lib/shop-source";
import { orderFromSession } from "@/lib/stripe-webhook";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath, type RouteKey } from "@/lib/routes";
import { CONTACT } from "@/lib/site";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "shopSuccess", "shopSuccess");
}

const NEXT_LINKS: { route: RouteKey; key: "nextLearn" | "nextBooking" | "nextResources" }[] = [
  { route: "learn", key: "nextLearn" },
  { route: "bookings", key: "nextBooking" },
  { route: "resources", key: "nextResources" },
];

/**
 * Vuelta de Stripe tras pagar (noindex, fuera del sitemap). Solo dice "pago
 * recibido" (y vacía el carrito) si Stripe confirma el pago de la sesión. Con el
 * pago confirmado muestra el detalle del pedido, la boleta (recibo de Stripe), las
 * descargas y los siguientes pasos.
 */
export default async function ShopSuccessPage({ params, searchParams }: PageProps & { searchParams: Promise<{ session_id?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const { session_id } = await searchParams;
  const sessionId = Array.isArray(session_id) ? undefined : session_id;
  const status = await paymentStatus(sessionId);
  // Pagado: se registra el pedido en el portal (idempotente; el aviso de Stripe puede llegar antes o después)
  // y se enseñan el detalle, la boleta y los enlaces de descarga de los productos que tienen archivo.
  let downloads: Awaited<ReturnType<typeof recordShopOrder>> = null;
  let order: ReturnType<typeof orderFromSession> | null = null;
  let receiptUrl: string | null = null;
  let createdAt: Date | null = null;
  let catalog: Awaited<ReturnType<typeof getShopProducts>> = [];
  if (status === "paid") {
    const paid = await retrievePaidSession(sessionId);
    if (paid) {
      catalog = await getShopProducts();
      order = orderFromSession(paid, catalog);
      receiptUrl = receiptUrlOf(paid);
      createdAt = new Date(paid.created * 1000);
      downloads = await recordShopOrder(order);
    }
  }
  const t = await getTranslations({ locale, namespace: "page.shopSuccess" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const tc = await getTranslations({ locale, namespace: "cart" });
  const buttons = heroButtons("purple");
  const tag = locale === "es" ? "es-AU" : "en-AU";
  const money = (cents: number) => `${formatAud(cents)} ${(order?.currency ?? "aud").toUpperCase()}`;
  const hasDownloads = Boolean(downloads && downloads.length > 0);

  return (
    <PageShell locale={locale} route="shopSuccess">
      {status === "paid" && <ClearCart />}
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("shop"), href: localePath(locale, "shop") },
          { label: t("crumb"), href: localePath(locale, "shopSuccess") },
        ]}
        titleA={t(`${status}.title`)}
        lead={
          <>
            <p>{hasDownloads ? t("paid.leadDownloads") : t(`${status}.lead`)}</p>
            <p className="mt-4 text-base">{t(`${status}.receipt`)}</p>
          </>
        }
        actions={
          <>
            <Link href={localePath(locale, "shop")} className={buttons.primary}>
              {t("backShop")}
            </Link>
            {status === "paid" ? (
              <Link href={localePath(locale, "myPurchases")} className={buttons.secondary}>
                {t("myPurchases")}
              </Link>
            ) : (
              <Link href={localePath(locale, "learn")} className={buttons.secondary}>
                {t("toLearn")}
              </Link>
            )}
          </>
        }
        aside={<HeroChat ask={t(`${status}.ask`)} answer={t(`${status}.answer`)} answerTone="yellow" />}
      />

      {order ? (
        <section aria-labelledby="order-title" className="bg-brand-yellow py-14">
          <div className={container}>
            <h2 id="order-title" className="font-display text-[2rem] leading-tight text-brand-burgundy">
              {t("order")}
            </h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
              <div className="rounded-[1.75rem] bg-cream p-5 ring-2 ring-ink/10 sm:p-6">
                <ul className="flex flex-col divide-y-2 divide-ink/10">
                  {order.items.map((item) => {
                    const product = findProduct(item.id, catalog);
                    const download = downloads?.find((d) => d.slug === item.id);
                    return (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="min-w-0 flex-1 leading-snug font-extrabold [overflow-wrap:anywhere]" lang={locale === "es" ? product?.nameLang : undefined}>
                          {product?.name[locale] ?? item.name}
                        </span>
                        <span className="font-semibold">{money(item.amountCents)}</span>
                        {download ? (
                          <a href={download.url} className={`${btnPrimary} !min-h-11 !px-4 !text-base`}>
                            {t("downloadItem")}
                          </a>
                        ) : (
                          <span className="text-sm text-ink-muted">{t("noFile")}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-5 flex items-baseline justify-between gap-4 border-t-2 border-ink/10 pt-4 text-lg">
                  <span className="font-bold">{t("total")}</span>
                  <span className="font-display text-[1.75rem] leading-none text-brand-burgundy">{money(order.totalCents)}</span>
                </p>
                {hasDownloads ? <p className="mt-3 text-sm text-ink-muted">{t("paid.downloadsNote")}</p> : null}
              </div>

              <div className="rounded-[1.75rem] bg-cream p-5 ring-2 ring-ink/10 sm:p-6">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-ink">
                  <dt className="font-bold">{t("orderNumber")}</dt>
                  <dd className="font-mono text-sm break-all">{order.sessionId.slice(-10).toUpperCase()}</dd>
                  {createdAt ? (
                    <>
                      <dt className="font-bold">{t("date")}</dt>
                      <dd>{new Intl.DateTimeFormat(tag, { dateStyle: "long", timeStyle: "short" }).format(createdAt)}</dd>
                    </>
                  ) : null}
                  {order.email ? (
                    <>
                      <dt className="font-bold">{t("email")}</dt>
                      <dd className="[overflow-wrap:anywhere]">{order.email}</dd>
                    </>
                  ) : null}
                </dl>
                {receiptUrl ? (
                  <>
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className={`${btnInk} mt-5 w-full`}>
                      {t("receiptButton")}
                    </a>
                    <p className="mt-2 text-sm text-ink-muted">{t("receiptNote")}</p>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {status === "paid" ? (
        <section aria-labelledby="next-title" className="bg-cream py-14">
          <div className={container}>
            <h2 id="next-title" className="font-display text-[2rem] leading-tight text-brand-burgundy">
              {t("nextTitle")}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <li className="rounded-[1.5rem] bg-surface p-5 ring-2 ring-brand-burgundy">
                <Link href={localePath(locale, "myPurchases")} className="inline-flex min-h-11 items-center font-extrabold text-brand-burgundy underline decoration-2 underline-offset-4">
                  {t("nextPurchases")}
                </Link>
                <p className="mt-1 text-sm text-ink">{t("nextPurchasesNote")}</p>
              </li>
              {NEXT_LINKS.map(({ route, key }) => (
                <li key={key} className="rounded-[1.5rem] bg-surface p-5 ring-2 ring-ink/10">
                  <Link href={localePath(locale, route)} className="inline-flex min-h-11 items-center font-extrabold text-brand-burgundy underline decoration-2 underline-offset-4">
                    {t(key)}
                  </Link>
                  <p className="mt-1 text-sm text-ink">{t(`${key}Note`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section aria-label={tn("contact")} className="bg-cream pb-14">
        <div className={container}>
          <p className="text-lg font-semibold text-ink">{tc("contactLead")}</p>
          <p className="mt-2 flex flex-wrap gap-x-6">
            <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-11 items-center font-bold text-brand-burgundy underline decoration-2 underline-offset-4">
              {CONTACT.email}
            </a>
            <a href={`tel:${CONTACT.phoneE164}`} className="inline-flex min-h-11 items-center font-bold text-brand-burgundy underline decoration-2 underline-offset-4">
              {CONTACT.phoneDisplay}
            </a>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
