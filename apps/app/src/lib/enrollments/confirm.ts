import "server-only";
import { z } from "zod";
import { createAdminClient } from "../supabase/admin";

/**
 * Matrículas pagadas con tarjeta. Lo llama la WEB (que no tiene la clave de servicio)
 * por /api/enrollments/confirm, con el secreto compartido WEB_REVALIDATE_SECRET, y solo
 * después de comprobar el pago con Stripe. Aquí sí hay service_role:
 *
 *   1. `confirm_enrollment_request` (una transacción en la base): ficha del alumno
 *      (+ tutor y consentimiento si es menor), matrícula activa y pago. Idempotente.
 *   2. Si es una persona adulta, su cuenta del portal: la que ya tenga con ese correo
 *      (se le añade el rol `student`) o una nueva. Los menores no tienen cuenta propia.
 *
 * El paso 2 no deshace el 1: si la cuenta no se puede crear, la matrícula y el pago
 * quedan registrados y la administradora puede dar el acceso desde la ficha.
 */
const SESSION = /^cs_(?:test|live)_[A-Za-z0-9]{10,200}$/;

export const confirmSchema = z.object({
  requestId: z.uuid(),
  sessionId: z.string().regex(SESSION),
  paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]{5,200}$/).optional(),
  amountCents: z.number().int().min(1).max(10_000_000),
  currency: z.string().length(3).default("aud"),
});
export type ConfirmInput = z.infer<typeof confirmSchema>;

type Admin = ReturnType<typeof createAdminClient>;

type Confirmed = {
  enrollment_id: string;
  student_id: string;
  already: boolean;
  email: string;
  full_name: string;
  is_minor: boolean;
  locale: "es" | "en";
};

function parseConfirmed(data: unknown): Confirmed | null {
  if (typeof data !== "object" || data === null) return null;
  const r = data as Record<string, unknown>;
  if (typeof r.enrollment_id !== "string" || typeof r.student_id !== "string" || typeof r.email !== "string") return null;
  return {
    enrollment_id: r.enrollment_id,
    student_id: r.student_id,
    already: r.already === true,
    email: r.email,
    full_name: typeof r.full_name === "string" ? r.full_name : "",
    is_minor: r.is_minor === true,
    locale: r.locale === "en" ? "en" : "es",
  };
}

/**
 * Cuenta del portal de una alumna adulta: la existente con ese correo (se le añade el rol
 * `student`) o una nueva ya confirmada. Entra con "olvidé mi contraseña" o con el enlace
 * que le envíe la administradora. Devuelve el id de la cuenta, o null si no se pudo.
 */
export async function ensureStudentAccount(admin: Admin, email: string, fullName: string, locale: "es" | "en"): Promise<string | null> {
  const clean = email.trim().toLowerCase();
  if (!clean || clean.length > 254) return null;

  const found = await admin.from("profiles").select("id").eq("email", clean).maybeSingle();
  if (found.error) return null;
  let userId = found.data?.id ?? null;

  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email: clean,
      email_confirm: true,
      app_metadata: { initial_role: "student" },
      user_metadata: { full_name: fullName.slice(0, 200) },
    });
    if (created.error || !created.data.user) {
      // Carrera: otro aviso del mismo pago la acaba de crear.
      const again = await admin.from("profiles").select("id").eq("email", clean).maybeSingle();
      userId = again.data?.id ?? null;
    } else {
      userId = created.data.user.id;
      await admin.from("profiles").update({ preferred_locale: locale }).eq("id", userId);
    }
  }
  if (!userId) return null;

  // Rol student (una clienta de la tienda solo tenía `customer`). La clave primaria evita duplicados.
  const role = await admin.from("user_roles").upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  return role.error ? null : userId;
}

export type ConfirmResult = { ok: true; enrollmentId: string; studentId: string; accountLinked: boolean } | { ok: false; status: 404 | 409 | 500 };

/** Confirma una prematrícula pagada con tarjeta (idempotente por prematrícula y por sesión de Stripe). */
export async function confirmPaidRequest(input: ConfirmInput, admin: Admin = createAdminClient()): Promise<ConfirmResult> {
  const { data, error } = await admin.rpc("confirm_enrollment_request", {
    p_request_id: input.requestId,
    p_payment: {
      amount_cents: input.amountCents,
      currency: input.currency.toLowerCase(),
      stripe_session_id: input.sessionId,
      ...(input.paymentIntentId ? { payment_intent_id: input.paymentIntentId } : {}),
    },
  });
  if (error) {
    console.error(`[enrollments] confirm_enrollment_request: ${error.code} ${error.message}`);
    if (error.code === "P0001" && error.message === "not_found") return { ok: false, status: 404 };
    return { ok: false, status: error.code === "23505" ? 409 : 500 };
  }
  const confirmed = parseConfirmed(data);
  if (!confirmed) return { ok: false, status: 500 };

  let accountLinked = false;
  if (!confirmed.is_minor) {
    const student = await admin.from("students").select("profile_id").eq("id", confirmed.student_id).maybeSingle();
    if (student.data?.profile_id) {
      accountLinked = true;
    } else if (!student.error) {
      const userId = await ensureStudentAccount(admin, confirmed.email, confirmed.full_name, confirmed.locale);
      if (userId) {
        // Si esa cuenta ya es de otra ficha (índice único), se deja sin enlazar: lo resuelve la administradora.
        const linked = await admin.from("students").update({ profile_id: userId }).eq("id", confirmed.student_id).is("profile_id", null);
        accountLinked = !linked.error;
        if (linked.error) console.error(`[enrollments] no se pudo enlazar la cuenta: ${linked.error.code}`);
      }
    }
  }
  return { ok: true, enrollmentId: confirmed.enrollment_id, studentId: confirmed.student_id, accountLinked };
}

/**
 * Reembolso de un pago de matrícula hecho en Stripe (Stripe avisa con el total devuelto de ese
 * cobro, así que repetirlo no suma dos veces). 404 si ningún pago de matrícula tiene ese cobro.
 * No cambia el estado de la matrícula: eso lo decide la administradora.
 */
export async function registerEnrollmentRefund(
  input: { paymentIntentId: string; refundedCents: number },
  admin: Admin = createAdminClient(),
): Promise<{ ok: true } | { ok: false; status: 404 | 500 }> {
  const found = await admin.from("enrollment_payments").select("id, amount_cents, refunded_cents").eq("payment_intent_id", input.paymentIntentId).maybeSingle();
  if (found.error) return { ok: false, status: 500 };
  if (!found.data) return { ok: false, status: 404 };
  const refunded = Math.min(input.refundedCents, found.data.amount_cents);
  if (refunded === found.data.refunded_cents) return { ok: true };
  const updated = await admin
    .from("enrollment_payments")
    .update({ refunded_cents: refunded, refunded_at: refunded > 0 ? new Date().toISOString() : null })
    .eq("id", found.data.id);
  return updated.error ? { ok: false, status: 500 } : { ok: true };
}
