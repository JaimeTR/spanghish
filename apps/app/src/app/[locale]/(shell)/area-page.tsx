import { CalendarClock, CalendarDays, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DevBadge } from "@/components/DevBadge";
import { NAV_ICONS } from "@/components/nav-icons";
import { onLightFocus } from "@/components/shell-styles";
import { isLocale, type Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { navItemsFor, navUrl } from "@/lib/nav";
import { requireArea } from "@/lib/require-area";

/**
 * Inicio de cada zona por rol; comprueba el rol en el servidor. Muestra el
 * saludo, (en administración) un resumen con datos de ejemplo claramente
 * marcados, y las tarjetas de todos los módulos del área con su estado.
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
    return (
      <>
        <header>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-text">{ta(area)}</h1>
          <p className="mt-1.5 text-text-muted">
            {greeting}. {t(`${area}.intro`)}
          </p>
        </header>
        {area === "admin" ? <SampleSummary locale={locale} /> : <TeacherToday locale={locale} />}
        <ModuleCards area={area} locale={locale} />
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
      <ModuleCards area={area} locale={locale} />
    </>
  );
}

async function TeacherToday({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home.teacher" });
  return (
    <section aria-labelledby="home-section" className="mt-8 rounded-md border border-line bg-surface">
      <h2 id="home-section" className="border-b border-line px-5 py-4 text-base font-semibold text-text">
        {t("todayTitle")}
      </h2>
      <div className="flex items-start gap-3 px-5 py-8 text-text-muted">
        <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-structure" strokeWidth={1.75} />
        <p className="max-w-[60ch]">{t("todayEmpty")}</p>
      </div>
    </section>
  );
}

/**
 * Resumen de la administración con cifras DE EJEMPLO (no consulta la base),
 * marcadas como tales. Cada tarjeta se sustituye por el dato real cuando exista
 * su módulo.
 */
const SAMPLE = [
  { key: "activeStudents", value: 42 },
  { key: "pendingEnrollments", value: 5 },
  { key: "newLeads", value: 3 },
  { key: "classesToday", value: 6 },
] as const;

async function SampleSummary({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home.admin" });
  return (
    <section aria-labelledby="home-section" className="mt-8 rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <h2 id="home-section" className="text-base font-semibold text-text">
          {t("summaryTitle")}
        </h2>
        <DevBadge label={t("sample.badge")} />
      </div>
      <p className="px-5 pt-4 text-sm text-text-muted">{t("sample.note")}</p>
      <dl className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {SAMPLE.map(({ key, value }) => (
          <div key={key} className="rounded-md border border-dashed border-line px-4 py-3">
            <dt className="text-sm text-text-muted">{t(`sample.${key}`)}</dt>
            <dd className="mt-1 text-2xl font-bold text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

async function ModuleCards({ area, locale }: { area: AppRole; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const th = await getTranslations({ locale, namespace: "home" });
  // La portada no se enlaza a sí misma.
  const items = navItemsFor(area).filter((i) => i.href !== `/${area}`);
  return (
    <section aria-labelledby="home-modules" className="mt-10">
      <h2 id="home-modules" className="text-lg font-semibold text-text">
        {th("modulesTitle")}
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const label = t(`items.${item.key}`);
          const inDev = item.status === "dev";
          return (
            <li key={item.key}>
              <Link
                href={navUrl(item, locale)}
                className={`flex min-h-16 items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-text transition-colors duration-150 hover:border-structure ${onLightFocus}`}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0 text-structure" strokeWidth={1.75} />
                <span className="flex-1 font-semibold">{label}</span>
                {inDev && <span className="sr-only">, </span>}
                {inDev && <DevBadge label={t("status.dev")} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
