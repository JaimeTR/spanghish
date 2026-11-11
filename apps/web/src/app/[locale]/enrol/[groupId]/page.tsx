import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EnrolForm } from "@/components/enrol/EnrolForm";
import { enrolGroupPath, GroupCard } from "@/components/enrol/GroupCard";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { getPublicGroups, isUuid } from "@/lib/enrol";
import { localePath } from "@/lib/routes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; groupId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "page.enrol" });
  // Formulario con datos personales: no se indexa.
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Datos de la persona que se inscribe en un grupo (y de su tutor, si el grupo es de niños). */
export default async function EnrolGroupPage({ params }: Props) {
  const { locale, groupId } = await params;
  if (!isLocale(locale) || !isUuid(groupId)) notFound();
  setRequestLocale(locale);
  const group = (await getPublicGroups()).find((g) => g.id === groupId);
  if (!group) notFound();

  const t = await getTranslations({ locale, namespace: "page.enrol" });
  const tf = await getTranslations({ locale, namespace: "enrol.form" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const full = group.seatsLeft === 0;

  return (
    <PageShell locale={locale} route="enrol">
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: t("crumb"), href: localePath(locale, "enrol") },
          { label: tf("crumb"), href: enrolGroupPath(locale, group.id) },
        ]}
        titleA={locale === "es" ? group.nameEs : group.nameEn}
        lead={<p>{full ? tf("leadFull") : tf("leadSeat")}</p>}
      />
      <section aria-labelledby="enrol-form-title" className="bg-cream py-14">
        <div className={`${container} grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start`}>
          <div>
            <h2 className="mb-4 font-display text-[1.75rem] leading-tight text-brand-burgundy">{tf("groupLabel")}</h2>
            <GroupCard locale={locale} group={group} action={false} />
          </div>
          <div>
            <h2 id="enrol-form-title" className="mb-6 font-display text-[1.75rem] leading-tight text-brand-burgundy">
              {tf("title")}
            </h2>
            <EnrolForm
              locale={locale}
              groupId={group.id}
              prices={group.prices}
              minor={group.audience === "kids"}
              full={full}
              termsHref={localePath(locale, "terms")}
              privacyHref={localePath(locale, "privacy")}
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
