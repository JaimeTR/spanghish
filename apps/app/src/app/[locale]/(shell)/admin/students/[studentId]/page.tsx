import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listLanguages, listLevels } from "@/lib/data/catalog";
import { getStudentDetail, listConsentTexts } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";
import { levelOptions } from "../../catalog/programs/options";
import { ConsentForm, PortalAccessForm, StudentEditForm } from "./StudentForms";

const dtClass = "text-sm text-text-muted";
const ddClass = "text-text";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  const { locale, studentId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const supabase = await createClient();
  const student = await getStudentDetail(supabase, studentId);
  if (!student) notFound();

  const [t, tc, te, languages, levels, texts] = await Promise.all([
    getTranslations({ locale, namespace: "students" }),
    getTranslations({ locale, namespace: "consents" }),
    getTranslations({ locale, namespace: "enums" }),
    listLanguages(supabase),
    listLevels(supabase),
    listConsentTexts(supabase),
  ]);
  const guardians = student.student_guardians.flatMap((sg) => (sg.guardians ? [{ ...sg.guardians, link: sg }] : []));
  const guardianName = new Map(guardians.map((g) => [g.id, g.full_name]));
  const privateRow = student.student_private;
  const isMinor = student.is_minor === true;

  return (
    <>
      <PageHeader
        title={student.full_name}
        intro={[
          te(`audience.${student.audience}`),
          te(`studentStatus.${student.status}`),
          isMinor ? t("minor") : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        back={{ href: `/${locale}/admin/students`, label: t("title") }}
      />

      <Section id="student-data" title={t("sections.data")}>
        <StudentEditForm
          locale={locale}
          levels={levelOptions(levels, languages, locale)}
          student={{
            id: student.id,
            full_name: student.full_name,
            level_id: student.level_id,
            preferred_locale: student.preferred_locale,
            status: student.status,
            email: privateRow?.email ?? null,
            phone: privateRow?.phone ?? null,
            birth_year: privateRow?.birth_year ?? null,
            admin_notes: student.student_admin_notes?.notes ?? null,
          }}
        />
      </Section>

      {isMinor || guardians.length > 0 ? (
        <Section id="student-guardians" title={t("sections.guardians")}>
          {guardians.length === 0 ? (
            <p className="text-text-muted">{t("noGuardians")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {guardians.map((g) => (
                <li key={g.id} className="py-3">
                  <p className="font-semibold text-text">
                    {g.full_name} · {te(`relationship.${g.link.relationship as "parent"}`)}
                  </p>
                  <dl className="mt-1 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
                    <dt className={dtClass}>{t("form.email")}</dt>
                    <dd className={ddClass}>{g.email}</dd>
                    {g.phone ? (
                      <>
                        <dt className={dtClass}>{t("form.phone")}</dt>
                        <dd className={ddClass}>{g.phone}</dd>
                      </>
                    ) : null}
                    <dt className={dtClass}>{t("guardianAccount")}</dt>
                    <dd className={ddClass}>{g.profile_id ? t("portal.yes") : t("portal.no")}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      <Section id="student-consents" title={t("sections.consents")}>
        {student.consents.length === 0 ? (
          <p className="text-text-muted">{tc("empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {student.consents.map((c) => (
              <li key={c.id} className="py-3">
                <p className="font-semibold text-text">
                  {te(`consentKind.${c.kind}`)} · {c.granted ? tc("granted") : tc("revoked")}
                </p>
                <p className="text-sm text-text-muted">
                  {tc("entry", {
                    version: c.text_id,
                    date: formatInstant(c.recorded_at, locale),
                    method: te(`consentMethod.${c.method}`),
                  })}
                  {c.guardian_id ? ` · ${tc("by", { name: guardianName.get(c.guardian_id) ?? "—" })}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mt-6 mb-3 font-semibold text-text">{tc("new")}</h3>
        {texts.length === 0 || (isMinor && guardians.length === 0) ? (
          <p className="text-sm text-text-muted">{tc("cannotRecord")}</p>
        ) : (
          <ConsentForm
            locale={locale}
            studentId={student.id}
            isMinor={isMinor}
            texts={texts.map((x) => ({ value: x.id, label: `${te(`consentKind.${x.kind}`)} · ${x.id}` }))}
            guardians={guardians.map((g) => ({ value: g.id, label: g.full_name }))}
          />
        )}
      </Section>

      {!isMinor ? (
        <Section id="student-portal" title={t("sections.portal")}>
          {student.profile_id ? (
            <p className="text-text">{t("portal.linked")}</p>
          ) : privateRow?.email ? (
            <>
              <p className="mb-3 text-text-muted">{t("portal.explain", { email: privateRow.email })}</p>
              <PortalAccessForm locale={locale} studentId={student.id} />
            </>
          ) : (
            <p className="text-text-muted">{t("portal.needsEmail")}</p>
          )}
        </Section>
      ) : null}
    </>
  );
}
