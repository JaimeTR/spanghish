type RequestStatusRow = { status: string; expires_at: string | null };

export function effectiveRequestStatus(row: RequestStatusRow, now: Date): string {
  return row.status === "pending_payment" && row.expires_at && new Date(row.expires_at) <= now ? "expired" : row.status;
}

export function paidCents(payments: readonly { amount_cents: number; refunded_cents: number }[]): number {
  return payments.reduce((sum, payment) => sum + payment.amount_cents - payment.refunded_cents, 0);
}

export function balanceCents(agreedCents: number | null, paid: number): number {
  return Math.max(0, (agreedCents ?? 0) - paid);
}

export function seatsTaken(enrollments: readonly { status: string }[], requests: readonly { status: string; expires_at: string | null }[], now: Date): number {
  return enrollments.filter((row) => ["pending", "active", "paused"].includes(row.status)).length +
    requests.filter((row) => row.status === "pending_payment" && !!row.expires_at && new Date(row.expires_at) > now).length;
}

export function billingModeForPrice(kind: string): "upfront" | "pack" | "payg" {
  return kind === "upfront" ? "upfront" : kind === "pack" ? "pack" : "payg";
}
