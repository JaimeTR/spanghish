"use server";

import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { isLikelySpam } from "@/lib/booking";
import { validateContact, type ContactErrors } from "@/lib/contact";
import { deliverLead } from "@/lib/leads";
import { localePath } from "@/lib/routes";

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: ContactErrors }
  | { status: "spam" | "unavailable" | "failed" };

/**
 * Recibe un mensaje de contacto general. Vuelve a validar en el servidor, descarta
 * bots y entrega el mensaje; si sale bien, redirige a /thank-you sin datos en la URL.
 */
export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !isLocale(locale)) return { status: "failed" };
  if (isLikelySpam(formData)) return { status: "spam" };

  const result = validateContact(formData);
  if (!result.ok) return { status: "invalid", errors: result.errors };

  const delivery = await deliverLead({ ...result.data, locale, kind: "contact" });
  if (!delivery.ok) return { status: delivery.reason };

  redirect(localePath(locale, "thankYou"));
}
