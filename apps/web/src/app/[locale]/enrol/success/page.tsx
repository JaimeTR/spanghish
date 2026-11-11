import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { btnPrimary, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { receiptUrlOf, retrievePaidSession } from "@/lib/checkout";
import { enrolmentRequestIdOf, getEnrolmentRequest, recordEnrolmentPayment, TOKEN } from "@/lib/enrol";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";
import { appLoginUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "enrolSuccess", "enrolSuccess");
}

type Search = { session_id?: string | string[]; t?: string | string[] };

/**
 * Vuelta de Stripe tras pagar una reserva (noindex). Solo dice "plaza confirmada" si Stripe
 * confirma el pago de la sesión Y el portal registró la matrícula (se le avisa aquí también,
 * por si el aviso de Stripe aún no llegó; es idempotente). Si el pago está hecho pero el portal
 * no responde, lo dice tal cual: el aviso de Stripe lo reintentará.
 */
export default async function EnrolSuccessPage({ params, searchParams }: PageProps & { searchParams: Promise<Search> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = await searchParams;
  const sessionId = Array.isArray(query.session_id) ? undefined : query.session_id;
  const token = typeof query.t === "string" && TOKEN.test(query.t) ? query.t : null;

  const paid = await retrievePaidSession(sessionId);
  const isEnrolment = paid ? enrolmentRequestIdOf(paid) !== null : false;
  const recorded = paid && isEnrolment ? await recordEnrolmentPayment(paid) : false;
  const request = token ? await getEnrolmentRequest(token) : null;
  // El enlace y la sesión deben ser de la misma reserva para enseñar sus datos.
  const mine = request && paid && enrolmentRequestIdOf(paid) === request.id ? request : null;
  const state: "paid" | "processing" | "unpaid" = paid && isEnrolment ? (recorded || mine?.status === "converted" ? "paid" : "processing") : "unpaid";
  const receiptUrl = paid && isEnrolment ? receiptUrlOf(paid) : null;

  const t = await getTranslations({ locale, namespace: "enrol.success" });
  const tp = await getTranslations({ locale, namespace: "page.enrol" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const buttons = heroButtons("purple");
  const adult = state === "paid" && mine && !mine.isMinor;

  return (
    <PageShell locale={locale} route="enrolSuccess">
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tp("crumb"), href: localePath(locale, "enrol") },
          { label: t("crumb"), href: localePath(locale, "enrolSuccess") },
        ]}
        titleA={t(`${state}Title`)}
        lead={<p>{state === "paid" && mine?.isMinor ? t("paidMinor") : t(`${state}Lead`)}</p>}
        actions={
          <>
            {state === "unpaid" && token ? (
              <Link href={`${localePath(locale, "enrol")}/pay/${token}`} className={buttons.primary}>
                {t("retry")}
              </Link>
            ) : (
              <Link href={localePath(locale, "home")} className={buttons.primary}>
                {t("backHome")}
              </Link>
            )}
            {receiptUrl ? (
              <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className={buttons.secondary}>
                {t("receipt")}
              </a>
            ) : null}
          </>
        }
      />
      {adult ? (
        <section aria-labelledby="enrol-portal" className="bg-brand-yellow py-14">
          <div className={container}>
            <h2 id="enrol-portal" className="font-display text-[2rem] leading-tight text-brand-burgundy">
              {t("portalTitle")}
            </h2>
            <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-ink">{t("portalLead")}</p>
            <p className="mt-6">
              <a href={appLoginUrl(locale)} className={btnPrimary}>
                {t("portalCta")}
              </a>
            </p>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
