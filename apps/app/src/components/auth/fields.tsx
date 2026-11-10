"use client";

import { Lock } from "lucide-react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { authField, authLabel, authToggle } from "./styles";

/** Envoltorio de un campo con un icono decorativo a la izquierda. */
export function IconField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative mt-1.5">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-muted">
        {icon}
      </span>
      {children}
    </div>
  );
}

/**
 * Campo de contraseña con botón "Mostrar / Ocultar" y aviso de Bloq Mayús.
 * El botón no lleva la palabra "contraseña" en su nombre: la etiqueta del campo
 * sigue siendo la única que la nombra (los lectores y las pruebas la encuentran
 * por ella). `footer` va a la derecha, bajo el campo (p. ej. "¿Olvidaste…?").
 */
export function PasswordField({
  id = "password",
  name = "password",
  label,
  showLabel,
  hideLabel,
  capsLockLabel,
  autoComplete = "current-password",
  describedBy,
  invalid,
  footer,
}: {
  id?: string;
  name?: string;
  label: string;
  showLabel: string;
  hideLabel: string;
  capsLockLabel: string;
  autoComplete?: string;
  describedBy?: string;
  invalid?: boolean;
  footer?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const capsId = useId();
  const syncCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState("CapsLock"));
  const described = [describedBy, capsLock ? capsId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className={authLabel}>
        {label}
      </label>
      <IconField icon={<Lock className="size-[1.125rem]" strokeWidth={1.75} />}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={invalid || undefined}
          aria-describedby={described}
          onKeyDown={syncCapsLock}
          onKeyUp={syncCapsLock}
          onBlur={() => setCapsLock(false)}
          className={`${authField} pr-24 pl-11`}
        />
        <button type="button" onClick={() => setVisible((value) => !value)} aria-controls={id} className={authToggle}>
          {visible ? hideLabel : showLabel}
        </button>
      </IconField>
      <div className="mt-1.5 flex min-h-6 items-start justify-between gap-3">
        <p id={capsId} aria-live="polite" className="text-sm font-semibold text-warning">
          {capsLock ? capsLockLabel : null}
        </p>
        {footer}
      </div>
    </div>
  );
}
