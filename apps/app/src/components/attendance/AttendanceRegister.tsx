"use client";

import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormStatus } from "@/components/forms/FormStatus";
import { useFormAction } from "@/components/forms/useFormAction";
import { markAllPresent, markAttendance } from "@/lib/sessions/actions";

export type RosterRow = { studentId: string; name: string; status: string | null };

const STATUSES = ["present", "late", "absent", "excused"] as const;
const TONE: Record<(typeof STATUSES)[number], string> = {
  present: "bg-success text-white",
  late: "bg-warning text-white",
  absent: "bg-danger text-white",
  excused: "bg-info text-white",
};

function StudentRow({ locale, sessionId, row, editable }: { locale: string; sessionId: string; row: RosterRow; editable: boolean }) {
  const t = useTranslations("classes.attendance");
  const form = useFormAction(markAttendance);
  return (
    <li className="py-3">
      <form action={form.formAction} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <input type="hidden" name="uiLocale" value={locale} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="studentId" value={row.studentId} />
        <span className="min-w-0 font-semibold text-text">{row.name}</span>
        <span role="group" aria-label={t("markFor", { name: row.name })} className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s}
              disabled={!editable}
              aria-pressed={row.status === s}
              className={`inline-flex min-h-11 min-w-20 items-center justify-center rounded-md border px-3 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:cursor-not-allowed disabled:opacity-60 ${
                row.status === s ? `${TONE[s]} border-transparent` : "border-line bg-surface text-text hover:bg-surface-sunken"
              }`}
            >
              {t(`status.${s}`)}
            </button>
          ))}
        </span>
      </form>
      <FormStatus state={form.state} />
    </li>
  );
}

/** Lista de la clase con la asistencia en un clic (pulsar de nuevo el mismo estado la quita). */
export function AttendanceRegister({ locale, sessionId, rows, editable }: { locale: string; sessionId: string; rows: RosterRow[]; editable: boolean }) {
  const t = useTranslations("classes.attendance");
  const all = useFormAction(markAllPresent);
  const unmarked = rows.filter((r) => r.status === null).length;
  if (rows.length === 0) return <p className="text-text-muted">{t("emptyRoster")}</p>;
  return (
    <div>
      {editable ? (
        <form action={all.formAction} className="mb-2 flex flex-wrap items-center gap-3">
          <input type="hidden" name="uiLocale" value={locale} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <button
            type="submit"
            disabled={unmarked === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck aria-hidden="true" className="size-5" strokeWidth={2} />
            {t("markAll")}
          </button>
          <FormStatus state={all.state} />
        </form>
      ) : null}
      <ul className="list-none divide-y divide-line p-0">
        {rows.map((row) => (
          <StudentRow key={row.studentId} locale={locale} sessionId={sessionId} row={row} editable={editable} />
        ))}
      </ul>
    </div>
  );
}
