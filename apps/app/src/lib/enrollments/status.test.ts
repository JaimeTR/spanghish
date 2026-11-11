import { describe, expect, it } from "vitest";
import { balanceCents, billingModeForPrice, effectiveRequestStatus, paidCents, seatsTaken } from "./status";

const now = new Date("2026-11-11T10:00:00Z");
const past = "2026-11-11T09:00:00Z";
const future = "2026-11-11T11:00:00Z";

describe("effectiveRequestStatus", () => {
  it("una reserva con pago pendiente y plazo vencido cuenta como caducada", () => {
    expect(effectiveRequestStatus({ status: "pending_payment", expires_at: past }, now)).toBe("expired");
    expect(effectiveRequestStatus({ status: "pending_payment", expires_at: future }, now)).toBe("pending_payment");
  });

  it("los demás estados no dependen del plazo", () => {
    expect(effectiveRequestStatus({ status: "waitlist", expires_at: null }, now)).toBe("waitlist");
    expect(effectiveRequestStatus({ status: "converted", expires_at: past }, now)).toBe("converted");
  });
});

describe("pagos", () => {
  it("lo pagado descuenta los reembolsos", () => {
    expect(paidCents([{ amount_cents: 31000, refunded_cents: 0 }, { amount_cents: 5000, refunded_cents: 5000 }])).toBe(31000);
    expect(paidCents([])).toBe(0);
  });

  it("el saldo nunca es negativo y sin importe acordado es cero", () => {
    expect(balanceCents(31000, 10000)).toBe(21000);
    expect(balanceCents(31000, 40000)).toBe(0);
    expect(balanceCents(null, 0)).toBe(0);
  });
});

describe("seatsTaken", () => {
  it("cuenta matrículas que ocupan plaza y reservas vivas", () => {
    const enrollments = [{ status: "active" }, { status: "paused" }, { status: "pending" }, { status: "cancelled" }, { status: "completed" }];
    const requests = [
      { status: "pending_payment", expires_at: future },
      { status: "pending_payment", expires_at: past },
      { status: "waitlist", expires_at: null },
    ];
    expect(seatsTaken(enrollments, requests, now)).toBe(4);
  });
});

describe("billingModeForPrice", () => {
  it("traduce el tipo de precio a la modalidad de la matrícula", () => {
    expect(billingModeForPrice("upfront")).toBe("upfront");
    expect(billingModeForPrice("pack")).toBe("pack");
    expect(billingModeForPrice("per_lesson")).toBe("payg");
  });
});
