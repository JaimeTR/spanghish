import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { leadEmailText, leadSubject, type OrderLead } from "./leads";
import { handleStripeWebhook, orderFromSession } from "./stripe-webhook";

const SECRET = "whsec_test_secret";
const env = { STRIPE_WEBHOOK_SECRET: SECRET };

function event(type: string, object: Record<string, unknown>) {
  return JSON.stringify({ id: "evt_test_1", object: "event", type, data: { object } });
}

const paidSession = {
  id: "cs_test_abc123",
  object: "checkout.session",
  payment_status: "paid",
  amount_total: 399,
  currency: "aud",
  customer_details: { email: "buyer@example.com" },
  metadata: { productIds: "alphabet,regular-verbs-spanish", locale: "en" },
};

function signed(payload: string, secret = SECRET) {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret });
}

describe("Stripe webhook", () => {
  it("rejects a missing or wrong signature with 400 and sends nothing", async () => {
    const deliver = vi.fn();
    const payload = event("checkout.session.completed", paidSession);
    expect((await handleStripeWebhook(payload, null, { env, deliver })).status).toBe(400);
    expect((await handleStripeWebhook(payload, signed(payload, "whsec_other"), { env, deliver })).status).toBe(400);
    // Cuerpo alterado después de firmar.
    expect((await handleStripeWebhook(payload.replace("399", "1"), signed(payload), { env, deliver })).status).toBe(400);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("rejects everything when the webhook secret is not configured", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const payload = event("checkout.session.completed", paidSession);
    expect((await handleStripeWebhook(payload, signed(payload), { env: {}, deliver: vi.fn() })).status).toBe(400);
    spy.mockRestore();
  });

  it("emails Maribel the paid order (manual delivery)", async () => {
    const deliver = vi.fn(async () => ({ ok: true as const, via: "log" as const }));
    const payload = event("checkout.session.completed", paidSession);
    const res = await handleStripeWebhook(payload, signed(payload), { env, deliver });
    expect(res).toEqual({ status: 200, body: "OK" });
    expect(deliver).toHaveBeenCalledWith({
      kind: "order",
      locale: "en",
      email: "buyer@example.com",
      sessionId: "cs_test_abc123",
      items: [
        { id: "alphabet", name: "El Abecedario – The Alphabet", amountCents: 200 },
        { id: "regular-verbs-spanish", name: "Regular Verbs in Spanish", amountCents: 199 },
      ],
      totalCents: 399,
      currency: "aud",
    });
  });

  it("ignores other events and unpaid sessions; asks Stripe to retry if the email fails", async () => {
    const deliver = vi.fn(async () => ({ ok: false as const, reason: "failed" as const }));
    const other = event("payment_intent.created", { id: "pi_1", object: "payment_intent" });
    expect(await handleStripeWebhook(other, signed(other), { env, deliver })).toEqual({ status: 200, body: "Ignored" });
    const unpaid = event("checkout.session.completed", { ...paidSession, payment_status: "unpaid" });
    expect(await handleStripeWebhook(unpaid, signed(unpaid), { env, deliver })).toEqual({ status: 200, body: "Not paid yet" });
    expect(deliver).not.toHaveBeenCalled();
    const paid = event("checkout.session.completed", paidSession);
    expect((await handleStripeWebhook(paid, signed(paid), { env, deliver })).status).toBe(500);
  });

  it("falls back to the default locale and flags unknown products", () => {
    const order = orderFromSession({ ...paidSession, metadata: { productIds: "ghost", locale: "fr" } } as unknown as Stripe.Checkout.Session);
    expect(order.locale).toBe("es");
    expect(order.items).toEqual([{ id: "ghost", name: "Unknown product", amountCents: 0 }]);
  });
});

describe("order email", () => {
  const order: OrderLead = {
    kind: "order",
    locale: "es",
    email: "buyer@example.com",
    sessionId: "cs_test_abc123",
    items: [{ id: "alphabet", name: "El Abecedario – The Alphabet", amountCents: 200 }],
    totalCents: 200,
    currency: "aud",
  };

  it("lists customer, products, total and session, and says delivery is manual", () => {
    const text = leadEmailText(order);
    expect(text).toContain("Customer email: buyer@example.com");
    expect(text).toContain("- El Abecedario – The Alphabet (alphabet): $2.00 AUD");
    expect(text).toContain("Total paid: $2.00 AUD");
    expect(text).toContain("Stripe Checkout session: cs_test_abc123");
    expect(text).toContain("DELIVERY IS MANUAL");
    expect(leadSubject(order)).toBe("Paid order (send the files): cs_test_abc123");
  });

  it("handles a missing customer email", () => {
    expect(leadEmailText({ ...order, email: "" })).toContain("Customer email: - (not provided");
  });
});
