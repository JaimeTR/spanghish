import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { SessionRegister } from "@/components/attendance/SessionRegister";
import { isLocale } from "@/i18n/routing";
import { isUuid } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";

export default async function AdminSessionAttendancePage({ params }: { params: Promise<{ locale: string; sessionId: string }> }) {
  const { locale, sessionId } = await params;
  if (!isLocale(locale) || !isUuid(sessionId)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "classes.attendance" });
  const register = await SessionRegister({ locale, sessionId, heading: "h2" });
  if (!register) notFound();
  return (
    <>
      <PageHeader title={t("title")} back={{ href: `/${locale}/admin/attendance`, label: t("back") }} />
      <div className="mt-6">{register}</div>
    </>
  );
}
