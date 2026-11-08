import { Button } from "@spanglish/ui";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 p-6">
      <h1 className="text-4xl font-bold text-structure">{t("title")}</h1>
      <Button>{t("cta")}</Button>
    </main>
  );
}
