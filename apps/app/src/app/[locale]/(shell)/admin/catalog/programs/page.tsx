import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RowActions, StatusBadge, TableCard, tableClass, tdClass, thClass } from "@/components/admin/PageHeader";
import { linkClass } from "@/components/form-styles";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listLanguages, listLevels, listPrograms } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { languageOptions, levelOptions } from "./options";
import { ProgramForm } from "./ProgramForm";

export default async function ProgramsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ new?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "catalog" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const { new: openNew } = await searchParams;
  const supabase = await createClient();
  const [programs, languages, levels] = await Promise.all([listPrograms(supabase), listLanguages(supabase), listLevels(supabase)]);
  const nameOf = (p: { name_es: string; name_en: string }) => (locale === "en" ? p.name_en : p.name_es);
  const href = (id: string) => `/${locale}/admin/catalog/programs/${id}`;

  return (
    <>
      <PageHeader
        title={t("programs.title")}
        intro={t("programs.intro")}
        back={{ href: `/${locale}/admin/catalog`, label: t("title") }}
        action={
          <ModalButton label={t("programs.new")} title={t("programs.new")} size="lg" defaultOpen={openNew === "1"}>
            <p className="mb-5 text-sm text-text-muted">{t("programs.newIntro")}</p>
            <ProgramForm
              locale={locale}
              languages={languageOptions(languages, locale)}
              levels={levelOptions(levels, languages, locale)}
            />
          </ModalButton>
        }
      />

      {programs.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("programs.empty")}</p>
      ) : (
        <>
          <TableCard>
          <table className={tableClass}>
            <caption className="sr-only">{t("programs.title")}</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>{t("programs.name")}</th>
                <th scope="col" className={thClass}>{t("programs.code")}</th>
                <th scope="col" className={thClass}>{t("programs.audience")}</th>
                <th scope="col" className={thClass}>{t("programs.format")}</th>
                <th scope="col" className={thClass}>{t("programs.state")}</th>
                <th scope="col" className={`${thClass} text-right`}>{t("programs.actions")}</th>
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
                    <StatusBadge tone={p.active ? "success" : "muted"}>{p.active ? t("active") : t("inactive")}</StatusBadge>
                    {p.is_public ? <span className="ml-2 text-xs text-text-muted">{t("programs.public")}</span> : null}
                  </td>
                  <td className={tdClass}>
                    <RowActions>
                      <IconLink href={href(p.id)} label={t("programs.edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableCard>
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
