import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  createEnrolCheckout,
  enrolCheckoutParams,
  enrolmentRequestIdOf,
  parseGroup,
  parseRequest,
  recordEnrolmentPayment,
  submitEnrollmentRequest,
  validateEnrol,
  type EnrolmentRequest,
} from "./enrol";
import { handleStripeWebhook } from "./stripe-webhook";

const UUID = (n: number) => `e1500000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const TOKEN = "a".repeat(64);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}
const valid = { groupId: UUID(1), priceId: UUID(2), name: "Ana Pérez", email: "Ana@Example.com", method: "stripe", terms: "yes" };

describe("validateEnrol", () => {
  it("acepta una reserva de adulto y normaliza el correo", () => {
    const result = validateEnrol(form(valid), false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ email: "ana@example.com", method: "stripe", guardianName: "" });
  });

  it("exige aceptar los términos, el nombre y un correo válido", () => {
    const result = validateEnrol(form({ ...valid, name: "", email: "no-es-correo", terms: "" }), false);
    expect(result).toMatchObject({ ok: false, errors: { name: "required", email: "invalid", terms: "required" } });
  });

  it("un grupo de niños pide tutor, fecha de nacimiento y consentimiento", () => {
    const result = validateEnrol(form(valid), true);
    expect(result).toMatchObject({ ok: false, errors: { guardianName: "required", birthDate: "required", consent: "required" } });
    const ok = validateEnrol(form({ ...valid, guardianName: "María", birthDate: "2018-05-01", consent: "yes" }), true);
    expect(ok.ok).toBe(true);
  });

  it("rechaza una fecha de nacimiento futura y una forma de pago desconocida", () => {
    const result = validateEnrol(form({ ...valid, birthDate: "2999-01-01", method: "bitcoin" }), false);
    expect(result).toMatchObject({ ok: false, errors: { birthDate: "invalid", method: "required" } });
  });
});

describe("parseGroup", () => {
  const row = {
    group_id: UUID(1),
    edition_id: UUID(3),
    name: "Grupo A",
    program_name_es: "Adultos A1",
    program_name_en: "Adults A1",
    audience: "adults",
    starts_on: "2027-02-01",
    ends_on: "2027-04-02",
    capacity: 8,
    seats_left: 3,
    prices: [{ id: UUID(2), kind: "upfront", amount_cents: 31000 }],
  };

  it("convierte la fila de la RPC", () => {
    expect(parseGroup(row)).toMatchObject({ id: UUID(1), seatsLeft: 3, prices: [{ kind: "upfront", amountCents: 31000 }] });
  });

  it("descarta grupos sin precio, con ids raros o con datos incompletos", () => {
    expect(parseGroup({ ...row, prices: [] })).toBeNull();
    expect(parseGroup({ ...row, group_id: "no-uuid" })).toBeNull();
    expect(parseGroup({ ...row, audience: "robots" })).toBeNull();
    expect(parseGroup(null)).toBeNull();
  });
});

describe("submitEnrollmentRequest", () => {
  const data = { groupId: UUID(1), priceId: UUID(2), name: "Ana", email: "a@example.com", phone: "", birthDate: "", guardianName: "", guardianRelationship: "parent" as const, method: "stripe" as const, message: "" };
  const env = { NEXT_PUBLIC_SUPABASE_URL: "http://db.local", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_x" };

  it("devuelve el token y el estado que decide la base", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: TOKEN, status: "waitlist" }), { status: 200 }));
    expect(await submitEnrollmentRequest(data, "es", env, fetchImpl)).toEqual({ ok: true, token: TOKEN, status: "waitlist" });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    // El importe nunca viaja desde el navegador: solo el id del precio.
    expect(body.p_payload).not.toHaveProperty("amount_cents");
    expect(body.p_payload.price_id).toBe(UUID(2));
  });

  it("traduce los errores de dominio de la base y no inventa reservas", async () => {
    const domain = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "not_available" }), { status: 400 }));
    expect(await submitEnrollmentRequest(data, "es", env, domain)).toEqual({ ok: false, reason: "not_available" });
    const bad = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "corto", status: "pending_payment" }), { status: 200 }));
    expect(await submitEnrollmentRequest(data, "es", env, bad)).toEqual({ ok: false, reason: "failed" });
    expect(await submitEnrollmentRequest(data, "es", {}, vi.fn())).toEqual({ ok: false, reason: "not_configured" });
  });
});

const request: EnrolmentRequest = {
  id: UUID(9),
  reference: "SP-ABCD1234",
  status: "pending_payment",
  method: "stripe",
  amountCents: 31000,
  expiresAt: null,
  fullName: "Ana Pérez",
  email: "ana@example.com",
  isMinor: false,
  groupId: UUID(1),
  groupName: "Grupo A",
  programNameEs: "Adultos A1",
  programNameEn: "Adults A1",
  startsOn: "2027-02-01",
  scheduleEs: null,
  scheduleEn: null,
};

describe("pago con tarjeta", () => {
  it("el importe del pago sale de la reserva guardada y se marca como matrícula", () => {
    const params = enrolCheckoutParams(request, TOKEN, "es", "https://spanglish.test", 1_700_000_000_000);
    expect(params.line_items?.[0]?.price_data?.unit_amount).toBe(31000);
    expect(params.metadata).toMatchObject({ kind: "enrollment", requestId: UUID(9) });
    expect(params.return_url).toContain(`t=${TOKEN}`);
  });

  it("sin Stripe configurado no finge un pago", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createEnrolCheckout(TOKEN, "es", null, {})).toEqual({ ok: false, reason: "unavailable" });
    expect(await createEnrolCheckout("token-raro", "es", null, {})).toEqual({ ok: false, reason: "invalid" });
    spy.mockRestore();
  });

  it("parseRequest descarta filas incompletas", () => {
    expect(parseRequest({ id: UUID(9) })).toBeNull();
    expect(parseRequest(null)).toBeNull();
  });
});

describe("pago confirmado → portal y webhook", () => {
  const SECRET = "whsec_test_secret";
  const env = { STRIPE_WEBHOOK_SECRET: SECRET };
  const session = {
    id: "cs_test_enrol123456",
    object: "checkout.session",
    payment_status: "paid",
    amount_total: 31000,
    currency: "aud",
    payment_intent: "pi_enrol12345",
    metadata: { kind: "enrollment", requestId: UUID(9), locale: "es" },
  };

  it("reconoce el pago de una prematrícula por sus metadatos", () => {
    expect(enrolmentRequestIdOf(session)).toBe(UUID(9));
    expect(enrolmentRequestIdOf({ metadata: { productIds: "alphabet" } })).toBeNull();
    expect(enrolmentRequestIdOf({ metadata: { kind: "enrollment", requestId: "no-uuid" } })).toBeNull();
  });

  it("avisa al portal con el secreto compartido y devuelve false si falla", async () => {
    const appEnv = { WEB_REVALIDATE_SECRET: "s".repeat(40), NEXT_PUBLIC_APP_URL: "https://app.test" };
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await recordEnrolmentPayment(session as unknown as Stripe.Checkout.Session, appEnv, fetchImpl)).toBe(true);
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://app.test/api/enrollments/confirm");
    expect(fetchImpl.mock.calls[0]![1].headers.Authorization).toBe(`Bearer ${"s".repeat(40)}`);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await recordEnrolmentPayment(session as unknown as Stripe.Checkout.Session, appEnv, vi.fn().mockResolvedValue(new Response("", { status: 500 })))).toBe(false);
    expect(await recordEnrolmentPayment({ ...session, payment_status: "unpaid" } as unknown as Stripe.Checkout.Session, appEnv, fetchImpl)).toBe(false);
    spy.mockRestore();
  });

  it("el webhook confirma la matrícula (no una compra de la tienda) y pide reintento si falla", async () => {
    const payload = JSON.stringify({ id: "evt_1", object: "event", type: "checkout.session.completed", data: { object: session } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const enrol = vi.fn().mockResolvedValue(true);
    const deliver = vi.fn();
    const ok = await handleStripeWebhook(payload, header, { env, deliver, enrol });
    expect(ok.status).toBe(200);
    expect(enrol).toHaveBeenCalledTimes(1);
    expect(deliver).not.toHaveBeenCalled();

    const failing = await handleStripeWebhook(payload, header, { env, deliver, enrol: vi.fn().mockResolvedValue(false) });
    expect(failing.status).toBe(500);
  });
});
