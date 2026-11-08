import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/BookingForm";
import { Bubble, SectionQuestion } from "@/components/Bubble";
import { ArrowIcon, PhoneIcon } from "@/components/icons";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { Steps } from "@/components/Steps";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";

const NEXT = ["send", "reply", "lesson"] as const;

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "bookings", "bookings");
}

/**
 * Clase gratis: la página de conversión. Un formulario de solicitud (no un
 * calendario): Maribel responde en persona para acordar día y hora.
 */
export default async function BookingsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.bookings" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const buttons = heroButtons("yellow");

  return (
    <PageShell locale={locale} route="bookings" jsonLd={[await crumbsJsonLd(locale, [{ route: "bookings", name: tn("bookings") }])]}>
      <PageHero
        tone="yellow"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("bookings"), href: localePath(locale, "bookings") },
        ]}
        titleA={t("titleA")}
        titleB={t("titleB")}
        lead={<p>{t("lead")}</p>}
        actions={
          <a href="#booking-form" className={buttons.primary}>
            {t("formLink")}
            <ArrowIcon />
          </a>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="purple" />}
      />

      <section id="booking-form" aria-labelledby="form-title" className="bg-surface-sunken py-16 lg:py-24">
        <div className={`${container} grid gap-14 lg:grid-cols-12 lg:gap-12`}>
          <div className="lg:col-span-7">
            <SectionQuestion id="form-title" tone="fuchsia">
              {t("formQuestion")}
            </SectionQuestion>
            <Bubble tone="white" tail="left" className="mt-8" boxClassName="px-5 py-7 sm:px-8 sm:py-9">
              <BookingForm locale={locale} privacyHref={localePath(locale, "privacy")} />
            </Bubble>
          </div>

          <aside aria-labelledby="next-title" className="flex flex-col gap-12 lg:col-span-5 lg:pt-4">
            <div>
              <h2 id="next-title" className="font-display text-[clamp(1.75rem,3.4vw,2.25rem)] leading-tight text-brand-purple">
                {t("nextQuestion")}
              </h2>
              <div className="mt-6">
                <Steps stacked items={NEXT.map((key) => ({ key, title: t(`next.${key}.title`), body: t(`next.${key}.body`) }))} />
              </div>
            </div>

            <div className="border-t-2 border-ink pt-6">
              <h2 className="font-display text-[clamp(1.75rem,3.4vw,2.25rem)] leading-tight text-brand-purple">{t("asideQuestion")}</h2>
              <p className="mt-1 text-lg text-ink">{t("asideBody")}</p>
              <ul className="mt-4 flex flex-col gap-1">
                <li>
                  <a
                    href={`tel:${CONTACT.phoneE164}`}
                    className="inline-flex min-h-11 items-center gap-3 font-display text-[1.75rem] text-brand-burgundy no-underline hover:underline"
                  >
                    <PhoneIcon className="size-6 text-brand-fuchsia" />
                    <span>
                      <span className="sr-only">{t("phoneLabel")} </span>
                      {CONTACT.phoneDisplay}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="inline-flex min-h-11 items-center font-bold [overflow-wrap:anywhere] text-ink underline"
                  >
                    <span className="sr-only">{t("emailLabel")} </span>
                    {CONTACT.email}
                  </a>
                </li>
              </ul>
            </div>

            <div className="border-t-2 border-ink pt-6">
              <h2 className="font-display text-[clamp(1.75rem,3.4vw,2.25rem)] leading-tight text-brand-purple">{t("moreQuestions")}</h2>
              <ul className="mt-3 flex flex-col">
                <li>
                  <Link href={localePath(locale, "faq")} className="inline-flex min-h-11 items-center gap-2 font-bold text-ink">
                    {t("moreFaq")}
                    <ArrowIcon />
                  </Link>
                </li>
                <li>
                  <Link href={localePath(locale, "prices")} className="inline-flex min-h-11 items-center gap-2 font-bold text-ink">
                    {t("morePrices")}
                    <ArrowIcon />
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}
