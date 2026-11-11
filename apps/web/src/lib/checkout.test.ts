import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { checkoutParams, createCheckoutSession, paymentStatus, stripeFromEnv, validateProductIds, type CheckoutClient } from "./checkout";
import { PRODUCTS } from "./shop";

function stubClient(result: { url: string | null } | Error = { url: "https://checkout.stripe.com/c/pay/cs_test_1" }) {
  const create = vi.fn(async (params: Stripe.Checkout.SessionCreateParams) => {
    void params;
    if (result instanceof Error) throw result;
    return result;
  });
  const client: CheckoutClient = { checkout: { sessions: { create } } };
  return { client, create };
}

describe("createCheckoutSession", () => {
  it("builds every line item from the server catalogue (only ids come from the browser)", async () => {
    const { client, create } = stubClient();
    const res = await createCheckoutSession(["regular-verbs-spanish", "alphabet"], "es", client, "https://example.test");
    expect(res).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    const params = create.mock.calls[0]![0];
    expect(params).toMatchObject({
      mode: "payment",
      currency: "aud",
      locale: "es",
      customer_creation: "always",
      metadata: { productIds: "regular-verbs-spanish,alphabet", locale: "es" },
      success_url: "https://example.test/es/shop/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://example.test/es/shop",
    });
    expect(params.automatic_tax).toBeUndefined();
    expect(params.line_items).toEqual([
      { quantity: 1, price_data: { currency: "aud", unit_amount: 199, product_data: { name: "Regular Verbs in Spanish", metadata: { productId: "regular-verbs-spanish" } } } },
      { quantity: 1, price_data: { currency: "aud", unit_amount: 200, product_data: { name: "El Abecedario – The Alphabet", metadata: { productId: "alphabet" } } } },
    ]);
  });

  it("maps the English site to Stripe's English page", () => {
    expect(checkoutParams(["alphabet"], "en", "https://x.test")).toMatchObject({ locale: "en", cancel_url: "https://x.test/en/shop" });
  });

  it("rejects unknown, duplicate, empty, too many or non-string ids without calling Stripe", async () => {
    const { client, create } = stubClient();
    for (const ids of [[], ["fake"], ["alphabet", "alphabet"], [1], "alphabet", null, Array(11).fill("alphabet")]) {
      expect(await createCheckoutSession(ids, "es", client)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(create).not.toHaveBeenCalled();
    expect(validateProductIds(PRODUCTS.map((p) => p.id))).toHaveLength(PRODUCTS.length);
  });

  it("is unavailable without STRIPE_SECRET_KEY and never pretends to succeed", async () => {
    expect(stripeFromEnv({})).toBeNull();
    expect(stripeFromEnv({ STRIPE_SECRET_KEY: "  " })).toBeNull();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createCheckoutSession(["alphabet"], "es", null)).toEqual({ ok: false, reason: "unavailable" });
    spy.mockRestore();
  });

  it("reports a failure when Stripe errors or returns no URL", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createCheckoutSession(["alphabet"], "es", stubClient(new Error("boom")).client)).toEqual({ ok: false, reason: "failed" });
    expect(await createCheckoutSession(["alphabet"], "es", stubClient({ url: null }).client)).toEqual({ ok: false, reason: "failed" });
    spy.mockRestore();
  });
});

describe("paymentStatus", () => {
  const client = (payment_status: string) => ({ checkout: { sessions: { retrieve: vi.fn(async () => ({ payment_status, status: "complete" })) } } });

  it("only says paid when Stripe confirms it", async () => {
    expect(await paymentStatus("cs_test_a1b2c3d4e5f6", client("paid"))).toBe("paid");
    expect(await paymentStatus("cs_test_a1b2c3d4e5f6", client("unpaid"))).toBe("unpaid");
  });

  it("is unknown without a key, with a malformed id or when Stripe fails", async () => {
    expect(await paymentStatus("cs_test_a1b2c3d4e5f6", null)).toBe("unknown");
    const c = client("paid");
    expect(await paymentStatus("../../etc", c)).toBe("unknown");
    expect(await paymentStatus(undefined, c)).toBe("unknown");
    expect(c.checkout.sessions.retrieve).not.toHaveBeenCalled();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = { checkout: { sessions: { retrieve: vi.fn(async () => Promise.reject(new Error("down"))) } } };
    expect(await paymentStatus("cs_live_a1b2c3d4e5f6", failing)).toBe("unknown");
    spy.mockRestore();
  });
});

describe("pago dentro de la web (embedded)", () => {
  it("pide ui_mode embedded_page con return_url y sin success_url/cancel_url", () => {
    const params = checkoutParams(["alphabet"], "en", "https://x.test", undefined, true);
    expect(params).toMatchObject({
      ui_mode: "embedded_page",
      redirect_on_completion: "if_required",
      return_url: "https://x.test/en/shop/success?session_id={CHECKOUT_SESSION_ID}",
    });
    expect(params).not.toHaveProperty("success_url");
    expect(params).not.toHaveProperty("cancel_url");
  });

  it("devuelve el client_secret y nunca una url", async () => {
    const create = vi.fn(async () => ({ url: null, client_secret: "cs_test_abc_secret_xyz" }));
    const client: CheckoutClient = { checkout: { sessions: { create } } };
    const res = await createCheckoutSession(["alphabet"], "es", client, "https://x.test", undefined, true);
    expect(res).toEqual({ ok: true, clientSecret: "cs_test_abc_secret_xyz" });
  });

  it("si Stripe no devuelve client_secret, falla sin fingir el pago", async () => {
    const create = vi.fn(async () => ({ url: null, client_secret: null }));
    const client: CheckoutClient = { checkout: { sessions: { create } } };
    expect(await createCheckoutSession(["alphabet"], "es", client, "https://x.test", undefined, true)).toEqual({ ok: false, reason: "failed" });
  });
});
