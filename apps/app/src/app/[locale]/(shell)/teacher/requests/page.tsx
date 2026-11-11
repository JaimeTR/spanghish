import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { DecideChangeRequest } from "@/components/classes/ChangeRequestForms";
import { RequestStatusBadge } from "@/components/classes/RequestStatusBadge";
import { EmptyState, ListSection, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatInstant, formatSessionTime, schoolToday } from "@/lib/time";

/** Cambios de clase (docente): avisos y pedidos de los alumnos de sus clases, para aprobar o rechazar. */
export default async function TeacherRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  const t = await getTranslations({ locale, namespace: "classes.requests" });
  const { data, error } = await (await createClient())
    .from("session_change_requests")
    .select("id, kind, note, status, response_note, decided_at, created_at, students(full_name), sessions(starts_at, ends_at, groups(name))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`session_change_requests: ${error.code}`);
  const pending = data.filter((r) => r.status === "pending");
  const decided = data.filter((r) => r.status !== "pending");

  const when = (r: (typeof data)[number]) =>
    r.sessions ? `${r.sessions.groups?.name ?? "—"} · ${formatDay(schoolToday(new Date(r.sessions.starts_at)), locale)} · ${formatSessionTime(r.sessions.starts_at, r.sessions.ends_at, locale)}` : "—";

  return (
    <PageContainer>
      <PageHeader title={t("title")} intro={t("introTeacher")} />
      <ListSection id="requests-pending" title={t("pending")}>
        {pending.length === 0 ? (
          <EmptyState className="mt-3">{t("noPending")}</EmptyState>
        ) : (
          <ul className="mt-3 list-none space-y-4 p-0">
            {pending.map((r) => (
              <li key={r.id} className="rounded-lg border border-line border-l-4 border-l-warning bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-text">
                      {r.students?.full_name ?? "—"} · {t(`kind.${r.kind}`)}
                    </p>
                    <p className="text-sm text-text-muted">{when(r)}</p>
                  </div>
                  <RequestStatusBadge status={r.status} />
                </div>
                {r.note ? <p className="mt-2 rounded-md bg-surface-sunken p-3 whitespace-pre-line text-text">{r.note}</p> : null}
                <DecideChangeRequest locale={locale} id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </ListSection>
      <ListSection id="requests-decided" title={t("history")}>
        {decided.length === 0 ? (
          <EmptyState className="mt-3">{t("noHistory")}</EmptyState>
        ) : (
          <ul className="mt-3 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
            {decided.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 px-5 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold text-text">
                    {r.students?.full_name ?? "—"} · {t(`kind.${r.kind}`)}
                  </span>
                  <span className="block text-sm text-text-muted">{when(r)}</span>
                  {r.response_note ? <span className="block text-sm text-text-muted">“{r.response_note}”</span> : null}
                </span>
                <span className="flex flex-col items-end gap-1">
                  <RequestStatusBadge status={r.status} />
                  <span className="text-xs text-text-muted">{formatInstant(r.decided_at ?? r.created_at, locale)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ListSection>
    </PageContainer>
  );
}
