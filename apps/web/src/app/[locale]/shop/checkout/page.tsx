import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { CheckoutView } from "@/components/shop/CheckoutView";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "shopCheckout", "shopCheckout");
}

/** Checkout (noindex): resumen del carrito y pago de Stripe sin salir de la web. */
export default async function ShopCheckoutPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "page.shopCheckout" });
  const tn = await getTranslations({ locale, namespace: "nav" });

  return (
    <PageShell locale={locale} route="shopCheckout">
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("shop"), href: localePath(locale, "shop") },
          { label: t("crumb"), href: localePath(locale, "shopCheckout") },
        ]}
        titleA={t("title")}
        lead={<p>{t("lead")}</p>}
      />
      <section aria-label={t("title")} className="bg-cream py-12">
        <div className={container}>
          <CheckoutView locale={locale} />
        </div>
      </section>
    </PageShell>
  );
}
