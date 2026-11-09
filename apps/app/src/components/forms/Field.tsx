import { useTranslations } from "next-intl";
import { cloneElement, type ReactElement } from "react";
import { labelClass } from "@/components/form-styles";
import type { FormErrorKey } from "@/lib/forms";

type ControlProps = {
  id?: string;
  name?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Etiqueta + control + ayuda + error. El control (input/select/textarea) recibe
 * id y name = `name`, `aria-invalid` si hay error y `aria-describedby` con la
 * ayuda y el error, para que el lector de pantalla los anuncie.
 */
export function Field({
  name,
  label,
  error,
  hint,
  children,
}: {
  name: string;
  label: string;
  error?: FormErrorKey;
  hint?: string;
  children: ReactElement<ControlProps>;
}) {
  const t = useTranslations("forms.errors");
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {cloneElement(children, {
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint ? (
        <p id={hintId} className="mt-1 text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm font-semibold text-danger">
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}
