import { CalendarClock, CalendarDays, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NAV_ICONS } from "@/components/nav-icons";
import { onLightFocus } from "@/components/shell-styles";
import { isLocale, type Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { navItemsFor, navUrl } from "@/lib/nav";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatSessionTime, schoolDayRange, schoolToday } from "@/lib/time";

/**
 * Inicio de cada zona por rol; comprueba el rol en el servidor. Muestra el saludo, un resumen con
 * datos reales (todo lo que se lee pasa por RLS: cada rol ve solo lo suyo) y las tarjetas de los
 * módulos del área. Docente y administración son operativos (título = área); alumno y tutor, más
 * cálidos (título = saludo).
 */
export async function AreaPage({ params, area }: { params: Promise<{ locale: string }>; area: AppRole }) {
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
        {area === "admin" ? <AdminSummary locale={locale} /> : <TeacherToday locale={locale} />}
        <ModuleCards area={area} locale={locale} />
      </>
    );
  }

  const Icon = area === "student" ? CalendarClock : UsersRound;
  return (
    <>
      <header>
        <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.025em] text-balance text-structure sm:text-[2.5rem]">{greeting}</h1>
        <p className="mt-2 text-lg text-text-muted">{t(`${area}.intro`)}</p>
      </header>
      <section aria-labelledby="home-card" className="mt-8 max-w-xl rounded-md bg-highlight p-6 text-on-highlight sm:p-8">
        {area === "student" ? <StudentCard locale={locale} Icon={Icon} /> : <GuardianCard locale={locale} Icon={Icon} />}
      </section>
      <ModuleCards area={area} locale={locale} />
    </>
  );
}

function CardTitle({ Icon, title }: { Icon: typeof CalendarClock; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-surface text-structure">
        <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
      </span>
      <h2 id="home-card" className="text-xl font-bold tracking-[-0.01em]">
        {title}
      </h2>
    </div>
  );
}

/** Próxima clase programada que ve esta persona (RLS: solo sus grupos, o los de sus hijos). */
async function nextSession(locale: Locale) {
  const { data } = await (await createClient())
    .from("sessions")
    .select("starts_at, ends_at, groups(name)")
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  return data ? { name: data.groups?.name ?? "", when: `${formatDay(schoolToday(new Date(data.starts_at)), locale)} · ${formatSessionTime(data.starts_at, data.ends_at, locale)}` } : null;
}

async function StudentCard({ locale, Icon }: { locale: Locale; Icon: typeof CalendarClock }) {
  const t = await getTranslations({ locale, namespace: "home.student" });
  const supabase = await createClient();
  const [next, tasks] = await Promise.all([
    nextSession(locale),
    supabase.from("assignments").select("id, assignment_submissions(id)").limit(200),
  ]);
  const pending = (tasks.data ?? []).filter((a) => a.assignment_submissions.length === 0).length;
  return (
    <>
      <CardTitle Icon={Icon} title={t("nextTitle")} />
      <p className="mt-4 text-[1.0625rem]">{next ? `${next.name} · ${next.when}` : t("nextEmpty")}</p>
      {pending > 0 ? (
        <p className="mt-3 text-[1.0625rem]">
          <Link href={`/${locale}/student/assignments`} className="font-semibold underline">
            {t("pendingTasks", { count: pending })}
          </Link>
        </p>
      ) : null}
    </>
  );
}

async function GuardianCard({ locale, Icon }: { locale: Locale; Icon: typeof CalendarClock }) {
  const t = await getTranslations({ locale, namespace: "home.guardian" });
  const supabase = await createClient();
  const [children, next] = await Promise.all([supabase.from("students").select("full_name").order("full_name"), nextSession(locale)]);
  const names = (children.data ?? []).map((c) => c.full_name);
  return (
    <>
      <CardTitle Icon={Icon} title={t("summaryTitle")} />
      <p className="mt-4 text-[1.0625rem]">{names.length === 0 ? t("summaryEmpty") : t("children", { names: names.join(", ") })}</p>
      {next ? (
        <p className="mt-3 text-[1.0625rem]">
          {t("next")}: {next.name} · {next.when}
        </p>
      ) : null}
    </>
  );
}

async function TeacherToday({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home.teacher" });
  const range = schoolDayRange(schoolToday());
  const { data } = await (await createClient())
    .from("sessions")
    .select("id, starts_at, ends_at, status, groups(name)")
    .gte("starts_at", range.from)
    .lt("starts_at", range.to)
    .neq("status", "cancelled")
    .order("starts_at");
  const sessions = data ?? [];
  return (
    <section aria-labelledby="home-section" className="mt-8 rounded-md border border-line bg-surface">
      <h2 id="home-section" className="border-b border-line px-5 py-4 text-base font-semibold text-text">
        {t("todayTitle")}
      </h2>
      {sessions.length === 0 ? (
        <div className="flex items-start gap-3 px-5 py-8 text-text-muted">
          <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-structure" strokeWidth={1.75} />
          <p className="max-w-[60ch]">{t("todayEmpty")}</p>
        </div>
      ) : (
        <ul className="list-none divide-y divide-line p-0">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span className="font-semibold text-text">{s.groups?.name ?? "—"}</span>
              <span className="text-sm text-text-muted">{formatSessionTime(s.starts_at, s.ends_at, locale)}</span>
            </li>
          ))}
          <li className="px-5 py-3">
            <Link href={`/${locale}/teacher/today`} className="font-semibold text-structure underline">
              {t("takeAttendance")}
            </Link>
          </li>
        </ul>
      )}
    </section>
  );
}

/** Resumen de administración con cifras reales de la base de datos (cada una lleva al módulo). */
async function AdminSummary({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home.admin" });
  const supabase = await createClient();
  const range = schoolDayRange(schoolToday());
  const count = { count: "exact", head: true } as const;
  const [students, enrollments, leads, today, changes] = await Promise.all([
    supabase.from("students").select("id", count).eq("status", "active"),
    supabase.from("enrollment_requests").select("id", count).in("status", ["pending_payment", "waitlist"]),
    supabase.from("leads").select("id", count).eq("status", "new"),
    supabase.from("sessions").select("id", count).gte("starts_at", range.from).lt("starts_at", range.to).neq("status", "cancelled"),
    supabase.from("session_change_requests").select("id", count).eq("status", "pending"),
  ]);
  const cards = [
    { key: "activeStudents", value: students.count, href: "students" },
    { key: "pendingEnrollments", value: enrollments.count, href: "enrollments?tab=requests" },
    { key: "newLeads", value: leads.count, href: "leads" },
    { key: "classesToday", value: today.count, href: "calendar" },
    { key: "pendingChanges", value: changes.count, href: "requests" },
  ] as const;
  return (
    <section aria-labelledby="home-section" className="mt-8 rounded-md border border-line bg-surface">
      <h2 id="home-section" className="border-b border-line px-5 py-4 text-base font-semibold text-text">
        {t("summaryTitle")}
      </h2>
      <dl className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ key, value, href }) => (
          <div key={key} className="rounded-md border border-line px-4 py-3">
            <dt className="text-sm text-text-muted">
              <Link href={`/${locale}/admin/${href}`} className={`font-semibold text-structure underline underline-offset-2 ${onLightFocus}`}>
                {t(`kpi.${key}`)}
              </Link>
            </dt>
            <dd className="mt-1 text-2xl font-bold text-text">{value ?? "—"}</dd>
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
          return (
            <li key={item.key}>
              <Link
                href={navUrl(item, locale)}
                className={`flex min-h-16 items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-text transition-colors duration-150 hover:border-structure ${onLightFocus}`}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0 text-structure" strokeWidth={1.75} />
                <span className="flex-1 font-semibold">{t(`items.${item.key}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
