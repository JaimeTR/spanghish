import Stripe from "stripe";
import type { Locale } from "../i18n/routing";
import { stripeFromEnv } from "./checkout";
import { getRpc, platformEnv, supabaseHeaders } from "./platform";
import { APP_URL, SITE_URL } from "./site";

/**
 * Prematrícula (reserva de plaza) desde la web. La web solo tiene la clave anónima:
 *
 *   - lee los grupos con plazas por la RPC `list_public_groups`;
 *   - envía la reserva por `submit_enrollment_request` (la base valida, toma el precio
 *     de SU tabla de precios y retiene la plaza o apunta en lista de espera);
 *   - la persona paga con su enlace secreto (`token`): con tarjeta, en un pago de Stripe
 *     dentro de la web cuyo importe sale de la reserva guardada, nunca del navegador;
 *   - con el pago confirmado por Stripe, avisa al portal (secreto compartido), que crea
 *     la ficha, la matrícula, el pago y la cuenta.
 */
type Env = Partial<Record<string, string | undefined>>;

export type GroupPrice = { id: string; kind: "upfront" | "pack" | "per_lesson"; amountCents: number; lessonsIncluded: number | null };

export type PublicGroup = {
  id: string;
  editionId: string;
  name: string;
  programCode: string;
  nameEs: string;
  nameEn: string;
  audience: "kids" | "adults" | "mature";
  levelCode: string | null;
  lessonMinutes: number;
  startsOn: string;
  endsOn: string;
  scheduleEs: string | null;
  scheduleEn: string | null;
  capacity: number;
  seatsLeft: number;
  location: { name: string; kind: string; mapUrl: string | null } | null;
  prices: GroupPrice[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const TOKEN = /^[0-9a-f]{64}$/;
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function parsePrice(row: unknown): GroupPrice | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const amount = num(r.amount_cents);
  if (!isUuid(r.id) || amount === null || amount <= 0) return null;
  if (r.kind !== "upfront" && r.kind !== "pack" && r.kind !== "per_lesson") return null;
  return { id: r.id, kind: r.kind, amountCents: amount, lessonsIncluded: num(r.lessons_included) };
}

/** Fila de la RPC → grupo; null si le falta algo imprescindible o no tiene ningún precio. */
export function parseGroup(row: unknown): PublicGroup | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const name = text(r.name);
  const nameEs = text(r.program_name_es);
  const nameEn = text(r.program_name_en);
  const startsOn = text(r.starts_on);
  const endsOn = text(r.ends_on);
  const capacity = num(r.capacity);
  const seatsLeft = num(r.seats_left);
  if (!isUuid(r.group_id) || !isUuid(r.edition_id) || !name || !nameEs || !nameEn || !startsOn || !endsOn) return null;
  if (!DAY.test(startsOn) || !DAY.test(endsOn) || capacity === null || seatsLeft === null) return null;
  if (r.audience !== "kids" && r.audience !== "adults" && r.audience !== "mature") return null;
  const prices = (Array.isArray(r.prices) ? r.prices : []).map(parsePrice).filter((p): p is GroupPrice => p !== null);
  if (prices.length === 0) return null;
  const loc = typeof r.location === "object" && r.location !== null ? (r.location as Record<string, unknown>) : null;
  const locName = loc ? text(loc.name) : null;
  const mapUrl = loc ? text(loc.map_url) : null;
  return {
    id: r.group_id,
    editionId: r.edition_id,
    name,
    programCode: text(r.program_code) ?? r.group_id,
    nameEs,
    nameEn,
    audience: r.audience,
    levelCode: text(r.level_code),
    lessonMinutes: num(r.lesson_minutes) ?? 70,
    startsOn,
    endsOn,
    scheduleEs: text(r.schedule_es),
    scheduleEn: text(r.schedule_en),
    capacity,
    seatsLeft: Math.max(0, seatsLeft),
    location: loc && locName ? { name: locName, kind: text(loc.kind) ?? "", mapUrl: mapUrl?.startsWith("https://") ? mapUrl : null } : null,
    prices,
  };
}

/**
 * Grupos que admiten reservas. Por defecto sin caché (las plazas libres cambian con cada reserva);
 * `fresh = false` usa la caché de 5 minutos, para páginas estáticas como Precios.
 */
export async function getPublicGroups(env: Env = process.env, fetchImpl: typeof fetch = fetch, fresh = true): Promise<PublicGroup[]> {
  const result = await getRpc<unknown>("list_public_groups", {}, env, fetchImpl, fresh ? { cache: "no-store" } : {});
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data.map(parseGroup).filter((g): g is PublicGroup => g !== null);
}

// ---------------------------------------------------------------------------
// Validación del formulario (misma en el navegador y en el servidor)
// ---------------------------------------------------------------------------
export const ENROL_MAX = { name: 120, email: 254, phone: 30, message: 1000 } as const;
export const ENROL_FIELDS = ["priceId", "name", "birthDate", "guardianName", "email", "phone", "method", "consent", "terms"] as const;
export type EnrolField = (typeof ENROL_FIELDS)[number];
export type EnrolErrors = Partial<Record<EnrolField, "required" | "invalid">>;
export type EnrolData = {
  groupId: string;
  priceId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  guardianName: string;
  guardianRelationship: "parent" | "legal_guardian" | "other";
  method: "stripe" | "transfer";
  message: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const field = (data: FormData, name: string): string => {
  const v = data.get(name);
  return typeof v === "string" ? v.trim() : "";
};

/** `minor`: el grupo es de niños (lo dice el servidor, no el formulario): pide tutor, fecha de nacimiento y consentimiento. */
export function validateEnrol(data: FormData, minor: boolean, today: Date = new Date()): { ok: true; data: EnrolData } | { ok: false; errors: EnrolErrors } {
  const errors: EnrolErrors = {};
  const groupId = field(data, "groupId");
  const priceId = field(data, "priceId");
  const name = field(data, "name");
  const email = field(data, "email").toLowerCase();
  const phone = field(data, "phone");
  const birthDate = field(data, "birthDate");
  const guardianName = field(data, "guardianName");
  const relationship = field(data, "guardianRelationship");
  const method = field(data, "method");
  const message = field(data, "message");

  if (!isUuid(priceId)) errors.priceId = "required";
  if (!name) errors.name = "required";
  else if (name.length > ENROL_MAX.name) errors.name = "invalid";
  if (!email) errors.email = "required";
  else if (!EMAIL.test(email) || email.length > ENROL_MAX.email) errors.email = "invalid";
  if (phone.length > ENROL_MAX.phone || (phone && !/^[+()\d\s.-]{6,30}$/.test(phone))) errors.phone = "invalid";
  if (birthDate) {
    const time = DAY.test(birthDate) ? Date.parse(`${birthDate}T00:00:00Z`) : Number.NaN;
    if (Number.isNaN(time) || time > today.getTime() || time < Date.parse("1900-01-01T00:00:00Z")) errors.birthDate = "invalid";
  } else if (minor) errors.birthDate = "required";
  if (minor) {
    if (!guardianName) errors.guardianName = "required";
    else if (guardianName.length > ENROL_MAX.name) errors.guardianName = "invalid";
    if (data.get("consent") !== "yes") errors.consent = "required";
  }
  if (method !== "stripe" && method !== "transfer") errors.method = "required";
  if (data.get("terms") !== "yes") errors.terms = "required";

  if (Object.keys(errors).length > 0 || !isUuid(groupId)) return { ok: false, errors: isUuid(groupId) ? errors : { ...errors, priceId: "required" } };
  return {
    ok: true,
    data: {
      groupId,
      priceId,
      name,
      email,
      phone,
      birthDate,
      guardianName: minor ? guardianName : "",
      guardianRelationship: relationship === "legal_guardian" || relationship === "other" ? relationship : "parent",
      method: method as "stripe" | "transfer",
      message: message.slice(0, ENROL_MAX.message),
    },
  };
}

// ---------------------------------------------------------------------------
// Escrituras en la plataforma (RPC con la clave anónima; nunca se cachean)
// ---------------------------------------------------------------------------
export type RpcFailure = "not_configured" | "failed" | "not_available" | "price_invalid" | "rate_limited" | "consent_text_missing" | "invalid" | "not_found";
type Call<T> = { ok: true; data: T } | { ok: false; reason: RpcFailure };

const KNOWN: readonly RpcFailure[] = ["not_available", "price_invalid", "rate_limited", "consent_text_missing", "invalid", "not_found"];

/** Llama a una RPC que escribe o no debe cachearse, y traduce los errores de dominio (P0001) de la base. */
async function callRpc<T>(fn: string, args: Record<string, unknown>, env: Env, fetchImpl: typeof fetch): Promise<Call<T>> {
  const cfg = platformEnv(env);
  if (!cfg) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetchImpl(`${cfg.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: supabaseHeaders(cfg.key),
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
      const message = typeof body?.message === "string" ? body.message : "";
      const known = KNOWN.find((k) => k === message);
      if (!known) console.error(`[enrol] ${fn}: HTTP ${res.status}`);
      // Errores de validación que el formulario ya comprobó (tutor, consentimiento, términos): datos inválidos.
      return { ok: false, reason: known ?? (res.status === 400 ? "invalid" : "failed") };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (error) {
    console.error(`[enrol] ${fn}: ${error instanceof Error ? error.name : "error"}`);
    return { ok: false, reason: "failed" };
  }
}

export type SubmitResult = { ok: true; token: string; status: "pending_payment" | "waitlist" } | { ok: false; reason: RpcFailure };

export async function submitEnrollmentRequest(data: EnrolData, locale: Locale, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<SubmitResult> {
  const result = await callRpc<{ token?: unknown; status?: unknown }>(
    "submit_enrollment_request",
    {
      p_payload: {
        group_id: data.groupId,
        price_id: data.priceId,
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        birth_date: data.birthDate,
        guardian_name: data.guardianName,
        guardian_relationship: data.guardianRelationship,
        consent: true,
        terms: true,
        payment_method: data.method,
        message: data.message,
        locale,
      },
    },
    env,
    fetchImpl,
  );
  if (!result.ok) return result;
  const token = result.data?.token;
  const status = result.data?.status;
  if (typeof token !== "string" || !TOKEN.test(token) || (status !== "pending_payment" && status !== "waitlist")) return { ok: false, reason: "failed" };
  return { ok: true, token, status };
}

export type RequestStatus = "pending_payment" | "waitlist" | "converted" | "expired" | "cancelled";
export type EnrolmentRequest = {
  id: string;
  reference: string;
  status: RequestStatus;
  method: "stripe" | "transfer";
  amountCents: number;
  expiresAt: string | null;
  fullName: string;
  email: string;
  isMinor: boolean;
  groupId: string;
  groupName: string;
  programNameEs: string;
  programNameEn: string;
  startsOn: string | null;
  scheduleEs: string | null;
  scheduleEn: string | null;
};

const STATUSES: readonly RequestStatus[] = ["pending_payment", "waitlist", "converted", "expired", "cancelled"];

export function parseRequest(row: unknown): EnrolmentRequest | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  const status = STATUSES.find((s) => s === r.status);
  const amount = num(r.amount_cents);
  const reference = text(r.reference);
  const fullName = text(r.full_name);
  const email = text(r.email);
  const groupName = text(r.group_name);
  if (!isUuid(r.id) || !isUuid(r.group_id) || !status || amount === null || !reference || !fullName || !email || !groupName) return null;
  return {
    id: r.id,
    reference,
    status,
    method: r.payment_method === "transfer" ? "transfer" : "stripe",
    amountCents: amount,
    expiresAt: text(r.expires_at),
    fullName,
    email,
    isMinor: r.is_minor === true,
    groupId: r.group_id,
    groupName,
    programNameEs: text(r.program_name_es) ?? groupName,
    programNameEn: text(r.program_name_en) ?? groupName,
    startsOn: text(r.starts_on),
    scheduleEs: text(r.schedule_es),
    scheduleEn: text(r.schedule_en),
  };
}

/** La reserva de un enlace de pago; null si el enlace no vale o la plataforma no responde. */
export async function getEnrolmentRequest(token: unknown, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<EnrolmentRequest | null> {
  if (typeof token !== "string" || !TOKEN.test(token)) return null;
  const result = await callRpc<unknown>("get_enrollment_request", { p_token: token }, env, fetchImpl);
  return result.ok ? parseRequest(result.data) : null;
}

/** Cambia la forma de pago de una reserva viva (y le da margen para terminar el pago con tarjeta). */
export async function setRequestMethod(token: string, method: "stripe" | "transfer", env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<EnrolmentRequest | null> {
  if (!TOKEN.test(token)) return null;
  const result = await callRpc<unknown>("set_enrollment_request_method", { p_token: token, p_method: method }, env, fetchImpl);
  return result.ok ? parseRequest(result.data) : null;
}

// ---------------------------------------------------------------------------
// Pago con tarjeta (Stripe, dentro de la web)
// ---------------------------------------------------------------------------
export type EnrolCheckoutClient = {
  checkout: { sessions: { create(params: Stripe.Checkout.SessionCreateParams): Promise<{ client_secret?: string | null }> } };
};

/** Parámetros del pago: el importe y el nombre salen de la reserva guardada en la base. */
export function enrolCheckoutParams(request: EnrolmentRequest, token: string, locale: Locale, siteUrl: string = SITE_URL, now: number = Date.now()): Stripe.Checkout.SessionCreateParams {
  const program = locale === "es" ? request.programNameEs : request.programNameEn;
  return {
    mode: "payment",
    currency: "aud",
    locale,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: request.amountCents,
          product_data: { name: `${program} · ${request.groupName}`.slice(0, 250), description: `${request.fullName} · ${request.reference}`.slice(0, 250) },
        },
      },
    ],
    customer_email: request.email,
    // El webhook distingue una matrícula de un pedido de la tienda por `kind`.
    metadata: { kind: "enrollment", requestId: request.id, locale },
    payment_intent_data: { metadata: { kind: "enrollment", requestId: request.id }, description: `${program} · ${request.reference}`.slice(0, 250) },
    // La sesión de pago caduca a los 30 minutos (el mínimo de Stripe): antes que la plaza retenida.
    expires_at: Math.floor(now / 1000) + 31 * 60,
    ui_mode: "embedded_page" as const,
    redirect_on_completion: "if_required" as const,
    return_url: `${siteUrl}/${locale}/enrol/success?session_id={CHECKOUT_SESSION_ID}&t=${token}`,
  };
}

export type EnrolCheckoutResult = { ok: true; clientSecret: string } | { ok: false; reason: "invalid" | "unavailable" | "failed" | "not_available" };

/** Empieza el pago con tarjeta de una reserva viva. Nunca finge un pago: sin Stripe, "unavailable". */
export async function createEnrolCheckout(
  token: unknown,
  locale: Locale,
  client: EnrolCheckoutClient | null = stripeFromEnv(),
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<EnrolCheckoutResult> {
  if (typeof token !== "string" || !TOKEN.test(token)) return { ok: false, reason: "invalid" };
  if (!client || !env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()) {
    console.error("[enrol] Faltan las claves de Stripe: pagos no activos");
    return { ok: false, reason: "unavailable" };
  }
  // Marca la reserva como "tarjeta" y le da margen: la plaza no caduca a mitad del pago.
  const request = await setRequestMethod(token, "stripe", env, fetchImpl);
  if (!request || request.status !== "pending_payment") return { ok: false, reason: "not_available" };
  try {
    const session = await client.checkout.sessions.create(enrolCheckoutParams(request, token, locale));
    return session.client_secret ? { ok: true, clientSecret: session.client_secret } : { ok: false, reason: "failed" };
  } catch (error) {
    console.error("[enrol] Stripe no pudo crear la sesión", error instanceof Error ? error.message : error);
    return { ok: false, reason: "failed" };
  }
}

// ---------------------------------------------------------------------------
// Pago confirmado → portal
// ---------------------------------------------------------------------------
/** ¿Es la sesión de Stripe el pago de una prematrícula? Devuelve su id, o null. */
export function enrolmentRequestIdOf(session: { metadata?: Record<string, string> | null }): string | null {
  const meta = session.metadata;
  return meta?.kind === "enrollment" && isUuid(meta.requestId) ? meta.requestId : null;
}

/**
 * Avisa al portal de una prematrícula PAGADA (sesión ya comprobada con Stripe). El portal crea
 * la ficha, la matrícula, el pago y la cuenta; repetir el aviso no duplica nada. false si falla
 * (el webhook responde 500 y Stripe reintenta).
 */
export async function recordEnrolmentPayment(session: Stripe.Checkout.Session, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const requestId = enrolmentRequestIdOf(session);
  const secret = env.WEB_REVALIDATE_SECRET;
  if (!requestId || session.payment_status !== "paid" || !secret || secret.length < 32) return false;
  const base = (env.NEXT_PUBLIC_APP_URL ?? APP_URL).replace(/\/$/, "");
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  try {
    const res = await fetchImpl(`${base}/api/enrollments/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        sessionId: session.id,
        ...(intent ? { paymentIntentId: intent } : {}),
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "aud",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.error(`[enrol] El portal respondió ${res.status} al confirmar la matrícula`);
    return res.ok;
  } catch (error) {
    console.error("[enrol] No se pudo avisar al portal", error instanceof Error ? error.message : error);
    return false;
  }
}
