import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { AUDIENCES, type Audience } from "@/lib/lessons";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { PRICE_VALUES } from "@/lib/prices";
import { localePath } from "@/lib/routes";
import { lessonServiceJsonLd } from "@/lib/structured-data";
import { PageShell } from "../PageShell";
import { AudiencePage } from "./AudiencePage";

/** generateMetadata de una página de clases por edad. */
export function audienceMetadata(audience: Audience) {
  return ({ params }: PageProps) => innerPageMetadata(params, AUDIENCES[audience].route, audience);
}

/** Página completa (con cabecera, pie y JSON-LD) de clases para un público. */
export async function AudienceRoute({ params, audience }: PageProps & { audience: Audience }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = AUDIENCES[audience];
  const t = await getTranslations({ locale, namespace: `page.${audience}` });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tn = await getTranslations({ locale, namespace: "nav" });

  const service = lessonServiceJsonLd({
    locale,
    path: localePath(locale, data.route),
    name: `${t("titleA")} ${t("titleB")}`,
    description: t("metaDescription", PRICE_VALUES),
    minAge: data.minAge,
    maxAge: data.maxAge,
    offers: data.offers.map((o) => ({
      description: o.upfront
        ? `${tc(`prices.${o.key}.title`)}: ${tc(`prices.${o.key}.body`, PRICE_VALUES)}`
        : `${tc(`prices.${o.key}.title`)}: ${tc(`prices.${o.key}.amount`, PRICE_VALUES)}`,
      price: o.price,
      minPrice: o.minPrice,
    })),
  });
  const crumbs = await crumbsJsonLd(locale, [
    { route: "lessons", name: tn("lessons") },
    { route: data.route, name: tc(`audiences.${audience}.name`) },
  ]);

  return (
    <PageShell locale={locale} route={data.route} jsonLd={[service, crumbs]}>
      <AudiencePage locale={locale} audience={audience} />
    </PageShell>
  );
}
