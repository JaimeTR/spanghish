import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { audFromCents, formatDay } from "@/lib/editions";
import type { PublicGroup } from "@/lib/enrol";
import { localePath } from "@/lib/routes";
import { btnInk, btnPrimary } from "../styles";

/** Ruta del formulario de reserva de un grupo. */
export function enrolGroupPath(locale: Locale, groupId: string): string {
  return `${localePath(locale, "enrol")}/${groupId}`;
}

/** Tarjeta de un grupo con reserva en línea: fechas, horario, sede, plazas y precio. `action`: con botón de reservar. */
export async function GroupCard({ locale, group, action = true }: { locale: Locale; group: PublicGroup; action?: boolean }) {
  const t = await getTranslations({ locale, namespace: "enrol.list" });
  const es = locale === "es";
  const schedule = es ? group.scheduleEs : group.scheduleEn;
  const cheapest = Math.min(...group.prices.map((p) => p.amountCents));
  const full = group.seatsLeft === 0;

  return (
    <div className="flex h-full flex-col rounded-3xl border-2 border-ink bg-surface p-6">
      <p className="text-sm font-bold tracking-wide text-brand-purple uppercase">
        {t(group.audience)}
        {group.levelCode ? ` · ${group.levelCode}` : ""} · {t("lessonLength", { minutes: group.lessonMinutes })}
      </p>
      <h3 className="mt-1 font-display text-[1.5rem] leading-tight text-ink">{es ? group.nameEs : group.nameEn}</h3>
      <p className="font-semibold text-ink-muted">{group.name}</p>
      <ul className="mt-4 space-y-2 text-ink">
        <li>
          {t("startsOn", { date: formatDay(group.startsOn, locale) })} · {t("endsOn", { date: formatDay(group.endsOn, locale) })}
        </li>
        {schedule ? <li>{schedule}</li> : null}
        {group.location ? <li>{group.location.kind === "online" ? t("online") : group.location.name}</li> : null}
        <li className="font-bold">{group.prices.length > 1 ? t("from", { amount: audFromCents(cheapest) }) : audFromCents(cheapest)}</li>
        <li>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${full ? "bg-ink text-cream" : "bg-brand-yellow text-ink"}`}>
            {full ? t("full") : t("seatsLeft", { count: group.seatsLeft })}
          </span>
        </li>
      </ul>
      {action ? (
        <div className="mt-auto pt-5">
          <Link href={enrolGroupPath(locale, group.id)} className={full ? btnInk : btnPrimary}>
            {full ? t("joinWaitlist") : t("reserve")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
