"use server";

import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { isLikelySpam, validateBooking, type BookingErrors } from "@/lib/booking";
import { submitLead } from "@/lib/leads";
import { localePath } from "@/lib/routes";

export type BookingState =
  | { status: "idle" }
  | { status: "invalid"; errors: BookingErrors }
  | { status: "spam" | "unavailable" | "failed" };

/**
 * Recibe la solicitud de clase gratis. Vuelve a validar todo en el servidor
 * (el navegador ya lo hizo, pero no se confía en él), descarta bots y entrega
 * el lead. Si sale bien, redirige a /thank-you sin datos personales en la URL.
 */
export async function submitBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !isLocale(locale)) return { status: "failed" };
  if (isLikelySpam(formData)) return { status: "spam" };

  const result = validateBooking(formData);
  if (!result.ok) return { status: "invalid", errors: result.errors };

  const delivery = await submitLead({ ...result.data, locale, kind: "booking" });
  if (!delivery.ok) return { status: delivery.reason };

  redirect(localePath(locale, "thankYou"));
}
