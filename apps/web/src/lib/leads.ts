import type { Locale } from "../i18n/routing";
import type { BookingData } from "./booking";
import type { ContactData } from "./contact";

/**
 * Entrega de solicitudes (leads). Adaptador sin SDK:
 * - Con RESEND_API_KEY, LEAD_TO_EMAIL y LEAD_FROM_EMAIL: email a Maribel vía la
 *   API REST de Resend (responder al email llega directamente a la persona).
 * - Sin ellas y fuera de producción: se escribe en la consola y cuenta como
 *   entregada (desarrollo local).
 * - Sin ellas en producción: "unavailable". La interfaz muestra el teléfono y el
 *   email; nunca se finge que la solicitud se ha enviado.
 *
 * LEADS_LOG_ONLY=1 fuerza el modo consola también en producción. Solo para la
 * e2e (que compila y arranca en modo producción); no definirla en un despliegue.
 */
export type BookingLead = BookingData & { locale: Locale; kind: "booking" };
export type ContactLead = ContactData & { locale: Locale; kind: "contact" };
export type Lead = BookingLead | ContactLead;

export type DeliveryResult =
  | { ok: true; via: "email" | "log" }
  | { ok: false; reason: "unavailable" | "failed" };

type Env = Partial<Record<string, string | undefined>>;

const RESEND_URL = "https://api.resend.com/emails";

const LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  audience: "Lessons for",
  place: "Where",
  times: "Preferred days/times",
  language: "Wants to learn/practise",
  message: "Message",
  locale: "Website language",
};

const FIELDS: Record<Lead["kind"], string[]> = {
  booking: ["name", "email", "phone", "audience", "place", "times", "language", "message", "locale"],
  contact: ["name", "email", "phone", "message", "locale"],
};

/** Cuerpo en texto plano (sin HTML: nada que escapar ni inyectar). */
export function leadEmailText(lead: Lead): string {
  const record = lead as unknown as Record<string, string>;
  const lines = FIELDS[lead.kind].map((k) => `${LABELS[k]}: ${record[k] || "-"}`);
  const title =
    lead.kind === "contact" ? "New contact message from spanglish.com.au" : "New free-lesson request from spanglish.com.au";
  return [
    title,
    "",
    ...lines,
    "Consent: yes (data used only to reply; under-18s: form filled in by a parent/guardian)",
    "",
    "Reply to this email to answer the person directly.",
  ].join("\n");
}

/** Asunto en una línea y acotado (el nombre ya llega sin saltos de línea). */
export function leadSubject(lead: Lead): string {
  return `${lead.kind === "contact" ? "Contact message" : "Free lesson request"}: ${lead.name}`.replace(/[\r\n]+/g, " ").slice(0, 150);
}

export async function deliverLead(
  lead: Lead,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<DeliveryResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.LEAD_TO_EMAIL?.trim();
  const from = env.LEAD_FROM_EMAIL?.trim();

  if (apiKey && to && from) {
    try {
      const res = await fetchImpl(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: to.split(",").map((s) => s.trim()).filter(Boolean),
          reply_to: lead.email,
          subject: leadSubject(lead),
          text: leadEmailText(lead),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error(`[leads] Resend respondió ${res.status}`);
        return { ok: false, reason: "failed" };
      }
      return { ok: true, via: "email" };
    } catch (error) {
      console.error("[leads] No se pudo contactar con Resend", error instanceof Error ? error.message : error);
      return { ok: false, reason: "failed" };
    }
  }

  if (env.NODE_ENV !== "production" || env.LEADS_LOG_ONLY === "1") {
    console.info(`[leads] (sin email configurado) ${leadSubject(lead)}\n${leadEmailText(lead)}`);
    return { ok: true, via: "log" };
  }

  console.error("[leads] Falta RESEND_API_KEY, LEAD_TO_EMAIL o LEAD_FROM_EMAIL: solicitud no entregada");
  return { ok: false, reason: "unavailable" };
}
