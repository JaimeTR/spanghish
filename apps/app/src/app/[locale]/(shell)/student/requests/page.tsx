import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CancelChangeRequest, NewChangeRequestForm } from "@/components/classes/ChangeRequestForms";
import { RequestStatusBadge } from "@/components/classes/RequestStatusBadge";
import { EmptyState, HeroHeader, ListSection, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDay, formatSessionTime, schoolDayRange, schoolToday } from "@/lib/time";

/** Cambios de clase (alumno): avisar que no asisto o pedir un cambio, y ver la respuesta de la docente. */
export default async function StudentRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  const t = await getTranslations({ locale, namespace: "classes.requests" });
  const ts = await getTranslations({ locale, namespace: "classes" });
  const supabase = await createClient();
  const today = schoolToday();
  const [student, sessions, requests] = await Promise.all([
    supabase.from("students").select("id").limit(1).maybeSingle(),
    supabase
      .from("sessions")
      .select("id, starts_at, ends_at, groups(name)")
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString())
      .lt("starts_at", schoolDayRange(addDays(today, 30)).to)
      .order("starts_at")
      .limit(60),
    supabase
      .from("session_change_requests")
      .select("id, session_id, kind, note, status, response_note, sessions(starts_at, ends_at, groups(name))")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  for (const res of [student, sessions, requests]) if (res.error) throw new Error(`requests: ${res.error.code}`);
  const pendingSessions = new Set(requests.data!.filter((r) => r.status === "pending").map((r) => r.session_id));
  const options = sessions.data!
    .filter((s) => !pendingSessions.has(s.id))
    .map((s) => ({ id: s.id, label: `${s.groups?.name ?? "—"} · ${formatDay(schoolToday(new Date(s.starts_at)), locale)} · ${formatSessionTime(s.starts_at, s.ends_at, locale)}` }));

  return (
    <PageContainer>
      <HeroHeader eyebrow={ts("eyebrow")} title={t("title")} lead={t("lead")} />
      {student.data ? (
        options.length > 0 ? (
          <div className="mt-8">
            <NewChangeRequestForm locale={locale} studentId={student.data.id} sessions={options} />
          </div>
        ) : (
          <EmptyState>{t("noClasses")}</EmptyState>
        )
      ) : null}
      <ListSection id="my-requests" title={t("mine")}>
        {requests.data!.length === 0 ? (
          <EmptyState className="mt-3">{t("noneYet")}</EmptyState>
        ) : (
          <ul className="mt-3 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
            {requests.data!.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 px-5 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold text-text">{t(`kind.${r.kind}`)}</span>
                  <span className="block text-sm text-text-muted">
                    {r.sessions
                      ? `${r.sessions.groups?.name ?? "—"} · ${formatDay(schoolToday(new Date(r.sessions.starts_at)), locale)} · ${formatSessionTime(r.sessions.starts_at, r.sessions.ends_at, locale)}`
                      : "—"}
                  </span>
                  {r.response_note ? <span className="block text-sm text-text-muted">{t("response", { text: r.response_note })}</span> : null}
                </span>
                <span className="flex items-center gap-1">
                  <RequestStatusBadge status={r.status} />
                  {r.status === "pending" ? <CancelChangeRequest locale={locale} id={r.id} /> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ListSection>
    </PageContainer>
  );
}
