import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Bubble, SectionQuestion } from "@/components/Bubble";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ContactBubbles } from "@/components/ContactBubbles";
import { ContactForm } from "@/components/ContactForm";
import { ArrowIcon, ClockIcon, PinIcon } from "@/components/icons";
import { PageShell } from "@/components/PageShell";
import { SocialLinks } from "@/components/SocialLinks";
import { btnOnDark, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { bookingPath, localePath } from "@/lib/routes";
import { contactPageJsonLd, organizationJsonLd } from "@/lib/structured-data";

const STEPS = ["contact", "tell", "book"] as const;

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "contact", "contact");
}

/**
 * Contacto: preguntas generales por teléfono, email o con el formulario corto de
 * esta página. La clase gratis se pide con el formulario por pasos de /bookings.
 */
export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.contact" });
  const tf = await getTranslations({ locale, namespace: "page.contactForm" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const tm = await getTranslations({ locale, namespace: "meta" });
  const path = localePath(locale, "contact");

  return (
    <PageShell
      locale={locale}
      route="contact"
      jsonLd={[
        contactPageJsonLd(locale, path, t("metaTitle")),
        organizationJsonLd(locale, tm("description")),
        await crumbsJsonLd(locale, [{ route: "contact", name: t("title") }]),
      ]}
    >
      {/* Hero: la respuesta a "¿cómo reservo?" son el teléfono y el email, a la vista. */}
      <section aria-labelledby="page-title" className="on-dark bg-brand-fuchsia text-on-primary">
        <div className={`${container} pt-3 pb-16 sm:pt-5 lg:pb-24`}>
          <Breadcrumbs
            items={[
              { label: tn("homeCrumb"), href: localePath(locale, "home") },
              { label: t("title"), href: path },
            ]}
          />
          <div className="mt-6 grid gap-x-12 gap-y-12 lg:mt-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <h1 id="page-title" className="lettering font-display text-[clamp(3rem,10vw,5rem)] leading-[0.95] text-brand-yellow">
                {t("title")}
              </h1>
              <Bubble tone="white" tail="left" shadow className="pop mt-8 inline-block max-w-full" boxClassName="px-6 py-4">
                <p className="font-display text-[clamp(1.4rem,3.4vw,1.85rem)] leading-tight text-ink">{t("ask")}</p>
              </Bubble>
              <p className="mt-6 max-w-[30rem] text-xl leading-relaxed sm:text-[1.375rem]">{t("lead")}</p>
            </div>
            <div className="flex flex-col gap-6 lg:col-span-7">
              <ContactBubbles phoneLabel={t("phoneLabel")} emailLabel={t("emailLabel")} />
            </div>
          </div>
        </div>
      </section>

      {/* Horario y zonas */}
      <section aria-labelledby="details-title" className="bg-cream py-16 lg:py-20">
        <div className={container}>
          <h2 id="details-title" className="sr-only">
            {t("detailsLabel")}
          </h2>
          <dl className="grid gap-x-12 gap-y-8 border-t-2 border-ink pt-8 md:grid-cols-2">
            <div>
              <dt className="flex items-center gap-4 font-display text-[1.75rem] leading-tight text-brand-purple">
                <ClockIcon className="size-7 shrink-0 text-brand-fuchsia" />
                {t("hoursLabel")}
              </dt>
              <dd className="mt-1 max-w-[30rem] pl-11 text-lg leading-relaxed text-ink">{t("hours")}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-4 font-display text-[1.75rem] leading-tight text-brand-purple">
                <PinIcon className="size-7 shrink-0 text-brand-fuchsia" />
                {t("areasLabel")}
              </dt>
              <dd className="mt-1 max-w-[30rem] pl-11 text-lg leading-relaxed text-ink">{t("areas")}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Escríbenos: formulario de contacto general (la clase gratis tiene el suyo en /bookings) */}
      <section id="message" aria-labelledby="form-title" className="bg-surface-sunken py-20 lg:py-28">
        <div className={`${container} grid items-start gap-x-14 gap-y-10 lg:grid-cols-12`}>
          <div className="flex flex-col items-start gap-5 lg:col-span-5 lg:pt-4">
            <SectionQuestion id="form-title" tone="fuchsia">
              {tf("question")}
            </SectionQuestion>
            <p className="max-w-[30rem] text-lg leading-relaxed text-ink">{tf("intro")}</p>
            <p className="max-w-[30rem] text-lg leading-relaxed text-ink-muted">{tf("bookingNote")}</p>
            <Link href={bookingPath(locale)} className="inline-flex min-h-11 items-center gap-2 font-bold text-brand-purple underline underline-offset-4">
              {tf("bookingLink")}
              <ArrowIcon />
            </Link>
          </div>
          <div className="lg:col-span-7">
            <Bubble tone="white" tail="right" shadow boxClassName="px-6 py-8 sm:px-10 sm:py-10">
              <ContactForm locale={locale} privacyHref={localePath(locale, "privacy")} />
            </Bubble>
          </div>
        </div>
      </section>

      {/* Cómo funciona la clase gratis */}
      <section id="free-lesson" aria-labelledby="steps-title" className="bg-brand-yellow py-20 lg:py-28">
        <div className={container}>
          <SectionQuestion id="steps-title" tone="white">
            {t("stepsQuestion")}
          </SectionQuestion>
          <ol className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-3">
            {STEPS.map((key, i) => (
              <li key={key} className="border-t-2 border-ink pt-5">
                <span aria-hidden="true" className="lettering block font-display text-[4.5rem] leading-none text-brand-fuchsia">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-xl font-extrabold text-ink">{t(`steps.${key}.title`)}</h3>
                <p className="mt-1.5 text-lg leading-relaxed text-ink">{t(`steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
          <Bubble
            tone="purple"
            tail="right"
            className="on-dark mt-14 md:ml-auto md:max-w-[42rem]"
            boxClassName="flex flex-col items-start gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
          >
            <p className="text-lg leading-relaxed">{t("bookingNote")}</p>
            <Link href={bookingPath(locale)} className={`${btnOnDark} shrink-0`}>
              {t("bookingCta")}
              <ArrowIcon />
            </Link>
          </Bubble>
        </div>
      </section>

      {/* Redes */}
      <section aria-labelledby="social-title" className="bg-cream py-20 lg:py-24">
        <div className={`${container} flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <SectionQuestion id="social-title" tone="fuchsia">
              {t("socialQuestion")}
            </SectionQuestion>
            <p className="mt-6 text-lg text-ink">{t("socialBody")}</p>
          </div>
          <SocialLinks tone="light" className="lg:max-w-[30rem] lg:justify-end" />
        </div>
      </section>
    </PageShell>
  );
}
