import { describe, expect, it } from "vitest";
import { paymentStatus, stripePaymentUrl, summarizePayments } from "./payments";

describe("payments", () => {
  it("deduce el estado de lo reembolsado", () => {
    expect(paymentStatus({ total_cents: 200, refunded_cents: 0 })).toBe("paid");
    expect(paymentStatus({ total_cents: 200, refunded_cents: 50 })).toBe("partial");
    expect(paymentStatus({ total_cents: 200, refunded_cents: 200 })).toBe("refunded");
  });

  it("suma cobrado, reembolsado y neto", () => {
    expect(
      summarizePayments([
        { total_cents: 200, refunded_cents: 200 },
        { total_cents: 199, refunded_cents: 0 },
      ]),
    ).toEqual({ collectedCents: 399, refundedCents: 200, netCents: 199, count: 2 });
    expect(summarizePayments([])).toEqual({ collectedCents: 0, refundedCents: 0, netCents: 0, count: 0 });
  });

  it("enlaza al pago de Stripe, en modo prueba si hace falta", () => {
    expect(stripePaymentUrl("pi_3abc", "cs_test_a1b2c3d4e5")).toBe("https://dashboard.stripe.com/test/payments/pi_3abc");
    expect(stripePaymentUrl("pi_3abc", "cs_live_a1b2c3d4e5")).toBe("https://dashboard.stripe.com/payments/pi_3abc");
    expect(stripePaymentUrl(null, "cs_test_a1b2c3d4e5")).toBeNull();
    expect(stripePaymentUrl("x/../y", "cs_test_a1b2c3d4e5")).toBeNull();
  });
});
