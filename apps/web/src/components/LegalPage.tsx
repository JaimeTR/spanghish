import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, type PageProps } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { container } from "./styles";

/**
 * Texto legal (privacidad, términos): hero sobrio y secciones numeradas en una
 * sola columna de lectura. Los textos van en `page.<namespace>.sections.*.body.*`
 * y pueden usar {email} y {phone}.
 */
export async function LegalPage({ params, route, namespace }: PageProps & { route: "privacy" | "terms"; namespace: string }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: `page.${namespace}` });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const values = { email: CONTACT.email, phone: CONTACT.phoneDisplay };
  const sections = Object.keys(t.raw("sections") as Record<string, unknown>);

  return (
    <PageShell locale={locale} route={route} jsonLd={[await crumbsJsonLd(locale, [{ route, name: t("title") }])]}>
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: t("title"), href: localePath(locale, route) },
        ]}
        titleA={t("title")}
        lead={
          <>
            <p>{t("lead")}</p>
            <p className="mt-4 text-base font-semibold">{t("updated")}</p>
          </>
        }
      />
      <div className="bg-cream py-16 lg:py-24">
        <div className={container}>
          <ol className="flex max-w-[46rem] flex-col gap-12">
            {sections.map((s, i) => (
              <li key={s}>
                <section aria-labelledby={`sec-${s}`} className="border-t-2 border-ink pt-5">
                  <h2 id={`sec-${s}`} className="flex items-baseline gap-4 font-display text-[clamp(1.6rem,3.6vw,2.25rem)] leading-tight text-brand-purple">
                    <span aria-hidden="true" className="lettering text-brand-fuchsia">
                      {i + 1}
                    </span>
                    {t(`sections.${s}.title`)}
                  </h2>
                  {Object.keys(t.raw(`sections.${s}.body`) as Record<string, string>).map((p) => (
                    <p key={p} className="mt-3 text-lg leading-relaxed text-ink">
                      {t(`sections.${s}.body.${p}`, values)}
                    </p>
                  ))}
                </section>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </PageShell>
  );
}
