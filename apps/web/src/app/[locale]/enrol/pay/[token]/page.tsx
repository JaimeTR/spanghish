import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EnrolPayment } from "@/components/enrol/EnrolPayment";
import { enrolGroupPath } from "@/components/enrol/GroupCard";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { btnInk, btnPrimary, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { formatDay } from "@/lib/editions";
import { getEnrolmentRequest, TOKEN } from "@/lib/enrol";
import { localePath } from "@/lib/routes";
import { formatAud } from "@/lib/shop";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "enrol.pay" });
  // Enlace personal de pago: nunca se indexa ni se cachea.
  return { title: `${t("title")} · Spanglish`, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

const TITLES = { pending_payment: "title", waitlist: "titleWaitlist", expired: "titleExpired", cancelled: "titleCancelled", converted: "titleConverted" } as const;
const LEADS = { waitlist: "waitlistLead", expired: "expiredLead", cancelled: "cancelledLead", converted: "convertedLead" } as const;

/** Página de pago de una reserva (enlace secreto): resumen, plazo y pago con tarjeta o transferencia. */
export default async function EnrolPayPage({ params }: Props) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !TOKEN.test(token)) notFound();
  setRequestLocale(locale);
  const request = await getEnrolmentRequest(token);
  if (!request) notFound();

  const t = await getTranslations({ locale, namespace: "enrol.pay" });
  const tp = await getTranslations({ locale, namespace: "page.enrol" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const es = locale === "es";
  const amount = `${formatAud(request.amountCents)} AUD`;
  const schedule = es ? request.scheduleEs : request.scheduleEn;
  const tag = es ? "es-AU" : "en-AU";
  const expires = request.expiresAt ? new Date(request.expiresAt) : null;
  // Tarjeta: plazo corto (se muestra la hora); transferencia: días (se muestra la fecha).
  const hold =
    request.status === "pending_payment" && expires
      ? request.method === "transfer"
        ? t("holdUntilDate", { date: new Intl.DateTimeFormat(tag, { dateStyle: "long", timeZone: "Australia/Brisbane" }).format(expires) })
        : t("holdUntil", { time: new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" }).format(expires) })
      : null;

  const lead = request.status === "pending_payment" ? "" : t(LEADS[request.status], { email: request.email });

  const rows: [string, string][] = [
    [t("course"), es ? request.programNameEs : request.programNameEn],
    [t("group"), request.groupName],
    [t("student"), request.fullName],
    ...(request.startsOn ? ([[t("starts"), formatDay(request.startsOn, locale)]] as [string, string][]) : []),
    ...(schedule ? ([[t("schedule"), schedule]] as [string, string][]) : []),
    [t("reference"), request.reference],
  ];

  return (
    <PageShell locale={locale} route="enrol">
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tp("crumb"), href: localePath(locale, "enrol") },
          { label: t("crumb"), href: `${localePath(locale, "enrol")}/pay/${token}` },
        ]}
        titleA={t(TITLES[request.status])}
        lead={<p>{request.status === "pending_payment" ? (hold ?? "") : lead}</p>}
      />
      <section aria-label={t("summary")} className="bg-cream py-14">
        <div className={`${container} grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start`}>
          <div className="rounded-[1.75rem] border-2 border-ink/10 bg-surface p-5 sm:p-6">
            <h2 className="font-display text-[1.75rem] leading-none text-brand-burgundy">{t("summary")}</h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-ink">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-semibold text-ink-muted">{k}</dt>
                  <dd className="min-w-0 font-semibold [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 flex items-baseline justify-between gap-4 border-t-2 border-ink/10 pt-4 text-lg">
              <span className="font-bold">{t("amount")}</span>
              <span className="font-display text-[1.75rem] leading-none text-brand-burgundy">{amount}</span>
            </p>
            <p className="mt-1 text-sm text-ink-muted">{t("currencyNote")}</p>
          </div>

          {request.status === "pending_payment" ? (
            <EnrolPayment locale={locale} token={token} amount={formatAud(request.amountCents)} method={request.method} email={request.email} reference={request.reference} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {request.status === "expired" ? (
                <Link href={enrolGroupPath(locale, request.groupId)} className={btnPrimary}>
                  {t("again")}
                </Link>
              ) : null}
              <Link href={localePath(locale, "contact")} className={btnInk}>
                {t("contact")}
              </Link>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
