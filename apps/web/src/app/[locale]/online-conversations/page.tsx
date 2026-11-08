import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { OnlineConversationsPage } from "@/components/lessons/OnlineConversationsPage";
import { PageShell } from "@/components/PageShell";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { PRICE_VALUES, PRICES } from "@/lib/prices";
import { localePath } from "@/lib/routes";
import { onlineCourseJsonLd } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "online", "online");
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.online" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const offer = (key: "upfront" | "lesson") =>
    `${t(`prices.${key}.title`)}: ${t(`prices.${key}.amount`, PRICE_VALUES)} ${t(`prices.${key}.unit`)}`;

  const course = onlineCourseJsonLd({
    path: localePath(locale, "online"),
    name: t("title"),
    description: t("metaDescription", PRICE_VALUES),
    offers: [
      { description: offer("upfront"), price: PRICES.onlineUpfront },
      { description: offer("lesson"), price: PRICES.onlineLesson },
    ],
  });
  const crumbs = await crumbsJsonLd(locale, [
    { route: "lessons", name: tn("lessons") },
    { route: "online", name: tn("online") },
  ]);

  return (
    <PageShell locale={locale} route="online" jsonLd={[course, crumbs]}>
      <OnlineConversationsPage locale={locale} />
    </PageShell>
  );
}
