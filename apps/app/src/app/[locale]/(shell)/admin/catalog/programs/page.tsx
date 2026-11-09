import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonLinkClass, PageHeader, tableClass, tdClass, thClass } from "@/components/admin/PageHeader";
import { linkClass } from "@/components/form-styles";
import { isLocale } from "@/i18n/routing";
import { listPrograms } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

export default async function ProgramsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "catalog" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const programs = await listPrograms(await createClient());
  const nameOf = (p: { name_es: string; name_en: string }) => (locale === "en" ? p.name_en : p.name_es);
  const href = (id: string) => `/${locale}/admin/catalog/programs/${id}`;

  return (
    <>
      <PageHeader
        title={t("programs.title")}
        intro={t("programs.intro")}
        back={{ href: `/${locale}/admin/catalog`, label: t("title") }}
        action={
          <Link href={`/${locale}/admin/catalog/programs/new`} className={buttonLinkClass}>
            {t("programs.new")}
          </Link>
        }
      />

      {programs.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("programs.empty")}</p>
      ) : (
        <>
          <table className={`mt-8 hidden md:table ${tableClass}`}>
            <caption className="sr-only">{t("programs.title")}</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>{t("programs.name")}</th>
                <th scope="col" className={thClass}>{t("programs.code")}</th>
                <th scope="col" className={thClass}>{t("programs.audience")}</th>
                <th scope="col" className={thClass}>{t("programs.format")}</th>
                <th scope="col" className={thClass}>{t("programs.state")}</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className={tdClass}>
                    <Link href={href(p.id)} className={linkClass}>
                      {nameOf(p)}
                    </Link>
                  </th>
                  <td className={`${tdClass} font-mono text-xs`}>{p.code}</td>
                  <td className={tdClass}>{te(`audience.${p.audience}`)}</td>
                  <td className={tdClass}>{te(`format.${p.format}`)}</td>
                  <td className={tdClass}>
                    {p.active ? t("active") : t("inactive")}
                    {p.is_public ? ` · ${t("programs.public")}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-6 flex flex-col gap-3 md:hidden">
            {programs.map((p) => (
              <li key={p.id} className="rounded-md border border-line bg-surface p-4">
                <Link href={href(p.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                  {nameOf(p)}
                </Link>
                <p className="text-sm text-text-muted">
                  {te(`audience.${p.audience}`)} · {te(`format.${p.format}`)} ·{" "}
                  {p.active ? t("active") : t("inactive")}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
