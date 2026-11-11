import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { audFromCents, formatDay, type PublicEdition } from "@/lib/editions";
import { localePath } from "@/lib/routes";
import { btnPrimary } from "./styles";

/**
 * Próximas ediciones abiertas (datos del Catálogo del portal): fechas, horario,
 * sede y precio. Cada tarjeta lleva a inscribirse: al enlace externo de la
 * edición si lo tiene, y si no, a escribirnos.
 */
export async function UpcomingEditions({ locale, editions }: { locale: Locale; editions: PublicEdition[] }) {
  const t = await getTranslations({ locale, namespace: "page.prices.editions" });
  const es = locale === "es";

  return (
    <div className="mt-14">
      <h3 className="font-display text-[1.75rem] leading-tight text-brand-burgundy">{t("title")}</h3>
      <p className="mt-1 max-w-[60ch] leading-relaxed text-ink-muted">{t("lead")}</p>
      <ul className="mt-6 grid gap-5 md:grid-cols-2">
        {editions.map((e) => {
          const schedule = es ? e.scheduleEs : e.scheduleEn;
          const price =
            e.upfrontCents !== null && e.perLessonCents !== null
              ? t("priceBoth", { upfront: audFromCents(e.upfrontCents), lesson: audFromCents(e.perLessonCents) })
              : e.upfrontCents !== null
                ? t("priceUpfront", { upfront: audFromCents(e.upfrontCents) })
                : e.perLessonCents !== null
                  ? t("priceLesson", { lesson: audFromCents(e.perLessonCents) })
                  : null;
          const href = e.enrolUrl ?? localePath(locale, "contact");
          return (
            <li key={e.id} className="flex flex-col rounded-3xl border-2 border-ink bg-surface p-6">
              <p className="text-sm font-bold tracking-wide text-brand-purple uppercase">
                {e.levelCode ? `${e.levelCode} · ` : ""}
                {t("lessonLength", { minutes: e.lessonMinutes })}
              </p>
              <h4 className="mt-1 font-display text-[1.5rem] leading-tight text-ink">{es ? e.nameEs : e.nameEn}</h4>
              <dl className="mt-4 space-y-2 text-ink">
                <div>
                  <dt className="sr-only">{t("when")}</dt>
                  <dd>
                    {t("startsOn", { date: formatDay(e.startsOn, locale) })} · {t("endsOn", { date: formatDay(e.endsOn, locale) })}
                  </dd>
                </div>
                {schedule ? (
                  <div>
                    <dt className="sr-only">{t("schedule")}</dt>
                    <dd>{schedule}</dd>
                  </div>
                ) : null}
                {e.location ? (
                  <div>
                    <dt className="sr-only">{t("where")}</dt>
                    <dd>
                      {e.location.kind === "online" ? t("online") : e.location.name}
                      {e.location.mapUrl ? (
                        <>
                          {" · "}
                          <a href={e.location.mapUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                            {t("map")}
                            <span className="sr-only"> ({t("newWindow")})</span>
                          </a>
                        </>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                {price ? (
                  <div>
                    <dt className="sr-only">{t("price")}</dt>
                    <dd className="font-bold">{price}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-auto pt-5">
                {e.enrolUrl ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                    {t("enrol")}
                    <span className="sr-only"> ({t("newWindow")})</span>
                  </a>
                ) : (
                  <Link href={href} className={btnPrimary}>
                    {t("enrol")}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-ink-muted">{t("note")}</p>
    </div>
  );
}
