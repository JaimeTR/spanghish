import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { ClearCart } from "@/components/shop/ClearCart";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { paymentStatus, retrievePaidSession } from "@/lib/checkout";
import { recordShopOrder } from "@/lib/shop-orders";
import { getShopProducts } from "@/lib/shop-source";
import { orderFromSession } from "@/lib/stripe-webhook";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "shopSuccess", "shopSuccess");
}

/**
 * Vuelta de Stripe tras pagar (noindex, fuera del sitemap). Solo dice "pago
 * recibido" (y vacía el carrito) si Stripe confirma el pago de la sesión; no
 * promete una entrega automática: Maribel envía los materiales por email.
 */
export default async function ShopSuccessPage({ params, searchParams }: PageProps & { searchParams: Promise<{ session_id?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const { session_id } = await searchParams;
  const sessionId = Array.isArray(session_id) ? undefined : session_id;
  const status = await paymentStatus(sessionId);
  // Pagado: se registra el pedido en el portal (idempotente; el aviso de Stripe puede llegar antes o después)
  // y se enseñan los enlaces de descarga de los productos que tienen archivo.
  let downloads: Awaited<ReturnType<typeof recordShopOrder>> = null;
  if (status === "paid") {
    const paid = await retrievePaidSession(sessionId);
    if (paid) downloads = await recordShopOrder(orderFromSession(paid, await getShopProducts()));
  }
  const t = await getTranslations({ locale, namespace: "page.shopSuccess" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const tc = await getTranslations({ locale, namespace: "cart" });
  const buttons = heroButtons("purple");

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
            <p>{downloads && downloads.length > 0 ? t("paid.leadDownloads") : t(`${status}.lead`)}</p>
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
            ) : null}
            <Link href={localePath(locale, "learn")} className={buttons.secondary}>
              {t("toLearn")}
            </Link>
          </>
        }
        aside={<HeroChat ask={t(`${status}.ask`)} answer={t(`${status}.answer`)} answerTone="yellow" />}
      />
      {downloads && downloads.length > 0 ? (
        <section aria-labelledby="downloads-title" className="bg-brand-yellow py-14">
          <div className={container}>
            <h2 id="downloads-title" className="font-display text-[2rem] leading-tight text-brand-burgundy">
              {t("paid.downloadsTitle")}
            </h2>
            <ul className="mt-6 flex flex-col gap-3">
              {downloads.map((d) => (
                <li key={d.slug}>
                  <a href={d.url} className={buttons.primary}>
                    {t("paid.download", { name: d.name })}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-[60ch] text-ink">{t("paid.downloadsNote")}</p>
          </div>
        </section>
      ) : null}
      <section aria-label={tn("contact")} className="bg-cream py-14">
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
