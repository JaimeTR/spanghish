import type { Locale } from "../i18n/routing";
import type { EnrolData, PublicGroup } from "./enrol";

/**
 * Aviso por correo a la escuela de una reserva nueva (misma configuración de Resend que las
 * solicitudes: RESEND_API_KEY, LEAD_TO_EMAIL, LEAD_FROM_EMAIL). Es solo un aviso: la reserva
 * ya está guardada en el portal (Matrículas → Prematrículas), así que si el correo no sale
 * no se rompe nada. Texto plano: nada que escapar.
 */
type Env = Partial<Record<string, string | undefined>>;

export type EnrolNotice = { data: EnrolData; group: PublicGroup; status: "pending_payment" | "waitlist"; locale: Locale };

export function enrolNoticeText({ data, group, status, locale }: EnrolNotice): string {
  const price = group.prices.find((p) => p.id === data.priceId);
  return [
    status === "waitlist" ? "New WAITING LIST request from spanglish.com.au" : "New place booking from spanglish.com.au",
    "",
    `Group: ${group.nameEn} · ${group.name}`,
    `Student: ${data.name}`,
    ...(data.guardianName ? [`Parent/guardian: ${data.guardianName}`] : []),
    `Email: ${data.email}`,
    `Phone: ${data.phone || "-"}`,
    `Amount: ${price ? `$${(price.amountCents / 100).toFixed(2)} AUD` : "-"}`,
    `Payment: ${status === "waitlist" ? "none yet (group full)" : data.method === "transfer" ? "BANK TRANSFER - send the bank details" : "card (online)"}`,
    `Message: ${data.message || "-"}`,
    `Website language: ${locale}`,
    "",
    "See it in the portal: Enrolments > Pre-enrolments.",
  ].join("\n");
}

export async function notifyEnrolmentRequest(notice: EnrolNotice, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.LEAD_TO_EMAIL?.trim();
  const from = env.LEAD_FROM_EMAIL?.trim();
  if (!apiKey || !to || !from) return false;
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        reply_to: notice.data.email,
        subject: `${notice.status === "waitlist" ? "Waiting list" : "Place booking"}: ${notice.data.name}`.replace(/[\r\n]+/g, " ").slice(0, 150),
        text: enrolNoticeText(notice),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[enrol] Resend respondió ${res.status}`);
    return res.ok;
  } catch (error) {
    console.error("[enrol] No se pudo enviar el aviso", error instanceof Error ? error.name : "error");
    return false;
  }
}
