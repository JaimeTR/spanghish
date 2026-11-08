import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { FOOTER_NAV, localePath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";
import { LocaleSwitch } from "./LocaleSwitch";
import { SocialLinks } from "./SocialLinks";
import { container } from "./styles";

const footerLink = "inline-flex min-h-11 items-center font-semibold text-on-structure no-underline transition-opacity duration-200 hover:underline hover:opacity-80";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="on-dark bg-brand-purple text-on-structure">
      <div className={`${container} grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12`}>
        <div className="md:col-span-2 lg:col-span-4">
          <Link href={localePath(locale, "home")} className="inline-block rounded-md">
            <Image src="/logo-spanglish.png" alt={tn("home")} width={110} height={87} />
          </Link>
          <p className="mt-5 max-w-[22rem] font-display text-[1.75rem] leading-tight text-brand-yellow">{t("tagline")}</p>
          <p className="mt-3 font-semibold">{t("areas")}</p>
        </div>

        <nav aria-label={tn("footerLabel")} className="grid grid-cols-2 gap-8 lg:col-span-4">
          {(["lessons", "school"] as const).map((group) => (
            <div key={group}>
              <h2 className="font-display text-2xl text-brand-yellow">
                {tn(group === "lessons" ? "footerLessons" : "footerSchool")}
              </h2>
              <ul className="mt-2 flex flex-col">
                {FOOTER_NAV[group].map((item) => (
                  <li key={item.key}>
                    <Link href={localePath(locale, item.route)} className={footerLink}>
                      {tn(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="lg:col-span-4">
          <h2 className="font-display text-2xl text-brand-yellow">{t("contactTitle")}</h2>
          <ul className="mt-2 flex flex-col">
            <li>
              <a href={`tel:${CONTACT.phoneE164}`} className={footerLink}>
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className={footerLink}>
                {CONTACT.email}
              </a>
            </li>
          </ul>
          <p className="mt-6 font-semibold">{t("follow")}</p>
          <SocialLinks className="mt-3" />
        </div>
      </div>
      <div className="border-t-2 border-on-structure/15">
        <div className={`${container} flex flex-wrap items-center justify-between gap-4 py-6`}>
          <p className="text-sm">{t("copyright", { year })}</p>
          <nav aria-label={tn("footerLegal")} className="sm:mr-auto sm:ml-6">
            <ul className="flex flex-wrap gap-x-6">
              {FOOTER_NAV.legal.map((item) => (
                <li key={item.key}>
                  <Link href={localePath(locale, item.route)} className={`${footerLink} text-sm`}>
                    {tn(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <LocaleSwitch locale={locale} tone="dark" />
        </div>
      </div>
    </footer>
  );
}
