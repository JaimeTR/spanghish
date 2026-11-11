"use server";

import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { isLikelySpam } from "@/lib/booking";
import {
  createEnrolCheckout,
  getPublicGroups,
  isUuid,
  setRequestMethod,
  submitEnrollmentRequest,
  TOKEN,
  validateEnrol,
  type EnrolErrors,
  type RpcFailure,
} from "@/lib/enrol";
import { notifyEnrolmentRequest } from "@/lib/enrol-notify";
import { localePath } from "@/lib/routes";

export type EnrolState = { status: "idle" } | { status: "invalid"; errors: EnrolErrors } | { status: "spam" | "unavailable" | Exclude<RpcFailure, "invalid"> };

/**
 * Reserva de plaza. Vuelve a validar todo en el servidor; si el grupo es de niños lo dice
 * la plataforma, no el formulario. La base toma el precio de su tabla y retiene la plaza
 * (o apunta en lista de espera). Después lleva a la página de pago de esa reserva.
 */
export async function submitEnrolment(_prev: EnrolState, formData: FormData): Promise<EnrolState> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !isLocale(locale)) return { status: "failed" };
  if (isLikelySpam(formData)) return { status: "spam" };

  const groupId = formData.get("groupId");
  const group = isUuid(groupId) ? (await getPublicGroups()).find((g) => g.id === groupId) : undefined;
  if (!group) return { status: "not_available" };

  const result = validateEnrol(formData, group.audience === "kids");
  if (!result.ok) return { status: "invalid", errors: result.errors };
  if (!group.prices.some((p) => p.id === result.data.priceId)) return { status: "price_invalid" };

  const saved = await submitEnrollmentRequest(result.data, locale);
  if (!saved.ok) return { status: saved.reason === "invalid" ? "failed" : saved.reason };

  // Aviso a la escuela (no bloquea: la reserva ya está en el portal).
  await notifyEnrolmentRequest({ data: result.data, group, status: saved.status, locale });

  redirect(`${localePath(locale, "enrol")}/pay/${saved.token}`);
}

export type PayState = { status: "idle" } | { status: "embedded"; clientSecret: string } | { status: "invalid" | "unavailable" | "failed" | "not_available" };

/** "Pagar con tarjeta": crea el pago de Stripe con el importe de la reserva guardada. */
export async function startEnrolPayment(_prev: PayState, formData: FormData): Promise<PayState> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !isLocale(locale)) return { status: "invalid" };
  const result = await createEnrolCheckout(formData.get("token"), locale);
  return result.ok ? { status: "embedded", clientSecret: result.clientSecret } : { status: result.reason };
}

/** "Prefiero transferencia": la plaza pasa a retenerse 5 días y la escuela envía los datos bancarios. */
export async function chooseTransfer(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  const token = formData.get("token");
  if (typeof locale !== "string" || !isLocale(locale) || typeof token !== "string" || !TOKEN.test(token)) return;
  await setRequestMethod(token, "transfer");
  redirect(`${localePath(locale, "enrol")}/pay/${token}`);
}
