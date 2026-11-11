import { getTranslations } from "next-intl/server";
import { Section, StatusBadge } from "@/components/admin/PageHeader";
import { ModalButton } from "@/components/ui/Modal";
import type { Locale } from "@/i18n/routing";
import { listPrograms } from "@/lib/data/catalog";
import { formatDay, formatInstant } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { NewPackForm, PackActions } from "./CreditForms";

/** Packs de clases de un alumno (ficha de administración): saldo, caducidad y movimientos. */
export async function CreditPacksSection({ locale, studentId }: { locale: Locale; studentId: string }) {
  const t = await getTranslations({ locale, namespace: "credits" });
  const supabase = await createClient();
  const es = locale === "es";
  const [packs, movements, programs] = await Promise.all([
    supabase.from("credit_pack_balances").select("pack_id, program_id, lessons_total, starts_on, expires_on, voided_at, note, remaining, is_expired").eq("student_id", studentId).order("starts_on", { ascending: false }),
    supabase.from("credit_movements").select("id, pack_id, delta, reason, note, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(40),
    listPrograms(supabase, { active: true }),
  ]);
  if (packs.error) throw new Error(`credit_pack_balances: ${packs.error.code}`);
  if (movements.error) throw new Error(`credit_movements: ${movements.error.code}`);
  const programName = new Map(programs.map((p) => [p.id, es ? p.name_es : p.name_en]));

  return (
    <Section
      id="student-packs"
      title={t("title")}
      action={
        <ModalButton label={t("new")} title={t("newTitle")} size="md">
          <NewPackForm locale={locale} studentId={studentId} programs={programs.map((p) => ({ id: p.id, name: es ? p.name_es : p.name_en }))} />
        </ModalButton>
      }
    >
      {packs.data!.length === 0 ? (
        <p className="text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="list-none divide-y divide-line p-0">
          {packs.data!.map((p) => {
            const state = p.voided_at ? "voided" : p.is_expired ? "expired" : "active";
            const own = movements.data!.filter((m) => m.pack_id === p.pack_id).slice(0, 6);
            return (
              <li key={p.pack_id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">
                      {t("remainingOf", { remaining: p.remaining ?? 0, total: p.lessons_total ?? 0 })} · {p.program_id ? (programName.get(p.program_id) ?? "—") : t("anyProgram")}
                    </p>
                    <p className="text-sm text-text-muted">
                      {t("since", { date: formatDay(p.starts_on, locale) })}
                      {p.expires_on ? ` · ${t("expires", { date: formatDay(p.expires_on, locale) })}` : ` · ${t("noExpiry")}`}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={state === "active" ? "success" : "muted"}>{t(`state.${state}`)}</StatusBadge>
                    <PackActions locale={locale} packId={p.pack_id} studentId={studentId} voided={Boolean(p.voided_at)} />
                  </div>
                </div>
                {own.length > 0 ? (
                  <ul className="mt-2 list-none space-y-0.5 p-0 text-sm text-text-muted">
                    {own.map((m) => (
                      <li key={m.id}>
                        <span className={m.delta < 0 ? "font-semibold text-text" : "font-semibold text-success"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span> · {t(`reason.${m.reason}`)}
                        {m.note ? ` · ${m.note}` : ""} · {formatInstant(m.created_at, locale)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
