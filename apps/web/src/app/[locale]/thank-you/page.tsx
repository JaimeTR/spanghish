import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SectionQuestion } from "@/components/Bubble";
import { ArrowIcon, ExternalIcon } from "@/components/icons";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { Steps } from "@/components/Steps";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath, type RouteKey } from "@/lib/routes";
import { CONTACT, LEARN_URL } from "@/lib/site";

const NEXT = ["read", "reply", "lesson"] as const;
const LINKS: { key: string; route?: RouteKey; href?: string }[] = [
  { key: "lessons", route: "lessons" },
  { key: "prices", route: "prices" },
  { key: "faq", route: "faq" },
  { key: "learn", href: LEARN_URL },
];

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "thankYou", "thankYou");
}

/**
 * Confirmación tras pedir la clase gratis. noindex y fuera del sitemap. No
 * muestra datos de la solicitud (la URL no los lleva) ni promete plazos.
 */
export default async function ThankYouPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.thankYou" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const ta = await getTranslations({ locale, namespace: "a11y" });
  const buttons = heroButtons("purple");

  return (
    <PageShell locale={locale} route="thankYou">
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: t("title"), href: localePath(locale, "thankYou") },
        ]}
        titleA={t("title")}
        lead={<p>{t("lead")}</p>}
        actions={
          <Link href={localePath(locale, "home")} className={buttons.secondary}>
            {t("backHome")}
          </Link>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="yellow" />}
      />

      <section aria-labelledby="next-title" className="bg-brand-yellow py-20 lg:py-24">
        <div className={container}>
          <SectionQuestion id="next-title" tone="white">
            {t("nextQuestion")}
          </SectionQuestion>
          <div className="mt-12">
            <Steps items={NEXT.map((key) => ({ key, title: t(`next.${key}.title`), body: t(`next.${key}.body`) }))} />
          </div>
          <p className="mt-10 text-lg font-semibold text-ink">{t.rich("spamNote", {
              phone: CONTACT.phoneDisplay,
              tel: (chunks) => (
                <a href={`tel:${CONTACT.phoneE164}`} className="underline">
                  {chunks}
                </a>
              ),
            })}</p>
        </div>
      </section>

      <section aria-labelledby="meanwhile-title" className="bg-cream py-20 lg:py-24">
        <div className={container}>
          <SectionQuestion id="meanwhile-title" tone="fuchsia">
            {t("meanwhileQuestion")}
          </SectionQuestion>
          <ul className="mt-12 grid gap-x-8 gap-y-2 border-t-2 border-ink md:grid-cols-2">
            {LINKS.map((l) => {
              const inner = (
                <>
                  <span className="flex items-center gap-2 font-display text-[1.75rem] leading-tight text-brand-purple">
                    {t(`links.${l.key}.title`)}
                    {l.href ? <ExternalIcon className="size-5" /> : <ArrowIcon />}
                  </span>
                  <span className="mt-1 block text-lg text-ink-muted">{t(`links.${l.key}.body`)}</span>
                </>
              );
              const cls = "block border-b border-ink/15 py-5 no-underline hover:[&>span:first-child]:underline";
              return (
                <li key={l.key}>
                  {l.route ? (
                    <Link href={localePath(locale, l.route)} className={cls}>
                      {inner}
                    </Link>
                  ) : (
                    <a href={l.href} className={cls}>
                      {inner}
                      <span className="sr-only"> {ta("external")}</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
