import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { CONTACT, NAV_ITEMS, SOCIAL } from "@/lib/site";
import { LocaleSwitch } from "./LocaleSwitch";
import { container } from "./styles";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const ta = useTranslations("a11y");
  const year = new Date().getFullYear();

  return (
    <footer className="on-dark bg-brand-purple text-on-structure">
      <div className={`${container} grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12`}>
        <div className="lg:col-span-5">
          <Image src="/logo-spanglish.png" alt="Spanglish" width={110} height={87} />
          <p className="mt-5 max-w-[22rem] font-display text-[1.75rem] leading-tight text-brand-yellow">{t("tagline")}</p>
          <p className="mt-3 font-semibold">{t("areas")}</p>
        </div>

        <nav aria-label={tn("footerLabel")} className="lg:col-span-3">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <a href={item.href} className="inline-flex min-h-11 items-center font-semibold text-on-structure no-underline hover:underline">
                  {tn(item.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-4">
          <h2 className="font-display text-2xl text-brand-yellow">{t("contactTitle")}</h2>
          <ul className="mt-2 flex flex-col">
            <li>
              <a href={`tel:${CONTACT.phoneE164}`} className="inline-flex min-h-11 items-center font-semibold text-on-structure hover:no-underline">
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-11 items-center font-semibold text-on-structure hover:no-underline">
                {CONTACT.email}
              </a>
            </li>
          </ul>
          <p className="mt-6 font-semibold">{t("follow")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SOCIAL.map((s) => (
              <li key={s.key}>
                <a
                  href={s.href}
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-on-structure/35 px-4 text-sm font-bold text-on-structure no-underline hover:border-brand-yellow hover:bg-brand-yellow hover:text-ink"
                >
                  {s.label}
                  <span className="sr-only"> {ta("opensSite", { name: s.label })}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t-2 border-on-structure/15">
        <div className={`${container} flex flex-wrap items-center justify-between gap-4 py-6`}>
          <p className="text-sm">{t("copyright", { year })}</p>
          <LocaleSwitch locale={locale} tone="dark" />
        </div>
      </div>
    </footer>
  );
}
