import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { isLocale } from "@/i18n/routing";

export default async function AccountSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("account");

  return (
    <section aria-labelledby="settings-title" className="max-w-2xl">
      <h1 id="settings-title" className="font-display text-3xl text-structure">
        {t("settingsTitle")}
      </h1>
      <p className="mt-2 text-text-muted">{t("settingsIntro")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-surface px-5 py-4">
        <div>
          <h2 className="font-semibold">{t("language")}</h2>
          <p className="text-sm text-text-muted">{t("languageHelp")}</p>
        </div>
        <LocaleSwitch locale={locale} />
      </div>
    </section>
  );
}
