import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { GroupCard } from "@/components/enrol/GroupCard";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { btnPrimary, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { getPublicGroups } from "@/lib/enrol";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";

// Las plazas libres cambian con cada reserva: siempre se lee de la plataforma.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "enrol", "enrol");
}

/** Grupos con reserva en línea: plazas libres y botón para reservar (o lista de espera). */
export default async function EnrolPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "page.enrol" });
  const tl = await getTranslations({ locale, namespace: "enrol.list" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const groups = await getPublicGroups();

  return (
    <PageShell locale={locale} route="enrol">
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: t("crumb"), href: localePath(locale, "enrol") },
        ]}
        titleA={t("title")}
        lead={<p>{t("lead")}</p>}
      />
      <section aria-labelledby="enrol-groups" className="bg-cream py-14">
        <div className={container}>
          <h2 id="enrol-groups" className="font-display text-[2rem] leading-tight text-brand-burgundy">
            {tl("title")}
          </h2>
          {groups.length === 0 ? (
            <div className="mt-6 flex flex-col items-start gap-4">
              <p className="max-w-[60ch] text-lg text-ink">{tl("empty")}</p>
              <Link href={localePath(locale, "contact")} className={btnPrimary}>
                {tl("emptyCta")}
              </Link>
            </div>
          ) : (
            <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <li key={g.id}>
                  <GroupCard locale={locale} group={g} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
