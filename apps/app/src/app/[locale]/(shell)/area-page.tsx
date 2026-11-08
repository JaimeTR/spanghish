import { CalendarClock, CalendarDays, ChartNoAxesColumn, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { requireArea } from "@/lib/require-area";

/**
 * Inicio de cada zona por rol; comprueba el rol en el servidor. Sin datos
 * inventados: solo el saludo y un estado vacío honesto hasta que existan clases.
 * Docente y administración son operativos (título = área); alumno y tutor,
 * más cálidos (título = saludo).
 */
export async function AreaPage({
  params,
  area,
}: {
  params: Promise<{ locale: string }>;
  area: AppRole;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const user = await requireArea(locale, area);
  const t = await getTranslations({ locale, namespace: "home" });
  const ta = await getTranslations({ locale, namespace: "areas" });
  const greeting = user.name ? t("greeting", { name: user.name }) : t("greetingNoName");

  if (area === "admin" || area === "teacher") {
    const section =
      area === "admin"
        ? { icon: ChartNoAxesColumn, title: t("admin.summaryTitle"), empty: t("admin.summaryEmpty") }
        : { icon: CalendarDays, title: t("teacher.todayTitle"), empty: t("teacher.todayEmpty") };
    const Icon = section.icon;
    return (
      <>
        <header>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-text">{ta(area)}</h1>
          <p className="mt-1.5 text-text-muted">
            {greeting}. {t(`${area}.intro`)}
          </p>
        </header>
        <section aria-labelledby="home-section" className="mt-8 rounded-md border border-line bg-surface">
          <h2 id="home-section" className="border-b border-line px-5 py-4 text-base font-semibold text-text">
            {section.title}
          </h2>
          <div className="flex items-start gap-3 px-5 py-8 text-text-muted">
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-structure" strokeWidth={1.75} />
            <p className="max-w-[60ch]">{section.empty}</p>
          </div>
        </section>
      </>
    );
  }

  const card =
    area === "student"
      ? { icon: CalendarClock, title: t("student.nextTitle"), empty: t("student.nextEmpty") }
      : { icon: UsersRound, title: t("guardian.summaryTitle"), empty: t("guardian.summaryEmpty") };
  const Icon = card.icon;
  return (
    <>
      <header>
        <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.025em] text-balance text-structure sm:text-[2.5rem]">
          {greeting}
        </h1>
        <p className="mt-2 text-lg text-text-muted">{t(`${area}.intro`)}</p>
      </header>
      <section
        aria-labelledby="home-card"
        className="mt-8 max-w-xl rounded-md bg-highlight p-6 text-on-highlight sm:p-8"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-surface text-structure">
            <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
          </span>
          <h2 id="home-card" className="text-xl font-bold tracking-[-0.01em]">
            {card.title}
          </h2>
        </div>
        <p className="mt-4 text-[1.0625rem]">{card.empty}</p>
      </section>
    </>
  );
}
