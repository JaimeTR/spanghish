"use client";

import { useActionState, useState } from "react";
import type { ActionState, FieldErrors } from "@/lib/forms";

type Snapshot = { version: number; values: Record<string, string> | null };

/**
 * `useActionState` para formularios no controlados que vuelven con errores.
 * React 19 vacía el formulario al terminar la acción; este hook recuerda lo
 * enviado y da una `formKey` que cambia en cada envío. Se pone como `key` del
 * contenedor de los campos (no del <form>, para que las regiones de FormStatus
 * sigan montadas y se anuncien), que se vuelve a montar con:
 *   - lo que se escribió, si la acción devolvió errores;
 *   - los valores iniciales (props), si fue bien (alta: formulario vacío;
 *     edición: los datos ya guardados).
 * Sin JS el navegador hace un envío normal y nada de esto aplica.
 */
export function useFormAction<F extends string>(
  action: (prev: ActionState<F>, formData: FormData) => Promise<ActionState<F>>,
  initial: ActionState<F> = { status: "idle" },
) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ version: 0, values: null });
  const [state, formAction, pending] = useActionState<ActionState<F>, FormData>(async (prev, formData) => {
    const values: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") values[key] = value;
    });
    const next = await action(prev, formData);
    setSnapshot((s) => ({ version: s.version + 1, values: next.status === "ok" ? null : values }));
    return next;
  }, initial);

  const { values } = snapshot;
  return {
    state,
    formAction,
    pending,
    formKey: snapshot.version,
    fieldErrors: state.status === "invalid" ? state.fieldErrors : ({} as FieldErrors<F>),
    /** Valor por defecto de un campo: lo enviado (si volvió con errores) o el inicial. */
    value(name: string, initialValue?: string | number | null): string | undefined {
      if (values) return values[name];
      return initialValue === null || initialValue === undefined ? undefined : String(initialValue);
    },
    /** Estado por defecto de una casilla. */
    checked(name: string, initialValue: boolean): boolean {
      return values ? values[name] === "on" : initialValue;
    },
  };
}
