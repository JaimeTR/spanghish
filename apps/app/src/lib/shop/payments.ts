/** Cálculos del módulo Pagos de administración (sin acceso a datos: se prueban solos). */
export type PaymentStatus = "paid" | "partial" | "refunded";

type Money = { total_cents: number; refunded_cents: number };

export function paymentStatus(order: Money): PaymentStatus {
  if (order.refunded_cents <= 0) return "paid";
  return order.refunded_cents >= order.total_cents ? "refunded" : "partial";
}

/** Cobrado = suma de los pedidos; neto = cobrado menos lo reembolsado. */
export function summarizePayments(orders: readonly Money[]) {
  const collectedCents = orders.reduce((n, o) => n + o.total_cents, 0);
  const refundedCents = orders.reduce((n, o) => n + o.refunded_cents, 0);
  return { collectedCents, refundedCents, netCents: collectedCents - refundedCents, count: orders.length };
}

/** Enlace al pago en el panel de Stripe (modo prueba si la sesión es cs_test_); null si el pedido no guarda el pago. */
export function stripePaymentUrl(paymentIntentId: string | null, sessionId: string): string | null {
  if (!paymentIntentId || !/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) return null;
  const test = sessionId.startsWith("cs_test_") ? "test/" : "";
  return `https://dashboard.stripe.com/${test}payments/${paymentIntentId}`;
}
