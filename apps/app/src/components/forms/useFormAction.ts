"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/forms";

export type SubmittedValues = Record<string, string>;

/**
 * `useActionState` que además recuerda los valores enviados. React 19 vacía los
 * formularios no controlados al terminar la acción; usando
 * `defaultValue={values.campo ?? inicial}` el formulario se rellena otra vez
 * con lo escrito cuando hay errores (sin JS, el navegador conserva el envío).
 */
export function useFormAction<F extends string>(
  action: (prev: ActionState<F>, formData: FormData) => Promise<ActionState<F>>,
  initial: ActionState<F> = { status: "idle" },
): [ActionState<F>, (formData: FormData) => void, SubmittedValues, boolean] {
  const [values, setValues] = useState<SubmittedValues>({});
  const [state, formAction, pending] = useActionState<ActionState<F>, FormData>(async (prev, formData) => {
    const next: SubmittedValues = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") next[key] = value;
    });
    setValues(next);
    return action(prev, formData);
  }, initial);
  return [state, formAction, values, pending];
}
