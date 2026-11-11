import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/PageHeader";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDay, formatSessionTime, schoolDayRange, schoolToday } from "@/lib/time";
import { SESSION_TONES } from "./SessionRegister";

/** Clases de los últimos 14 días y los próximos 7, con enlace a su lista de asistencia (`base/<id>`). */
export async function SessionList({ locale, base }: { locale: Locale; base: string }) {
  const t = await getTranslations({ locale, namespace: "classes" });
  const today = schoolToday();
  const { data, error } = await (await createClient())
    .from("sessions")
    .select("id, starts_at, ends_at, status, groups(name, code), attendance(id)")
    .gte("starts_at", schoolDayRange(addDays(today, -14)).from)
    .lt("starts_at", schoolDayRange(addDays(today, 7)).to)
    .order("starts_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`sessions: ${error.code}`);
  if (data.length === 0) return <p className="mt-8 text-text-muted">{t("attendance.emptyList")}</p>;

  return (
    <ul className="mt-6 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
      {data.map((s) => (
        <li key={s.id}>
          <Link
            href={`${base}/${s.id}`}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3.5 hover:bg-surface-sunken focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-brand-purple"
          >
            <span className="min-w-0">
              <span className="block font-semibold text-text">{s.groups?.name ?? "—"}</span>
              <span className="block text-sm text-text-muted">
                {formatDay(schoolToday(new Date(s.starts_at)), locale)} · {formatSessionTime(s.starts_at, s.ends_at, locale)}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-sm text-text-muted">{t("attendance.marked", { count: s.attendance.length })}</span>
              <StatusBadge tone={SESSION_TONES[s.status]}>{t(`sessionStatus.${s.status}`)}</StatusBadge>
              <ClipboardCheck aria-hidden="true" className="size-5 text-structure" strokeWidth={1.75} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
