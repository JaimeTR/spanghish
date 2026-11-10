"use client";

import { Check, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { IconButton, IconSubmit } from "./IconButton";

/**
 * Borrado en dos pasos, solo con iconos: la papelera pide confirmar con un ✓ (y
 * un ✕ para cancelar). Va dentro de un <form>: el ✓ es el botón de envío. Los
 * textos son nombres accesibles y tooltips, no se ven.
 */
export function ConfirmDelete({
  label,
  confirmLabel,
  cancelLabel,
}: {
  /** Nombre de la papelera (p. ej. "Eliminar recurso"). */
  label: string;
  /** Nombre del ✓ que confirma (p. ej. "¿Seguro?"). */
  confirmLabel: string;
  cancelLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const trashRef = useRef<HTMLButtonElement>(null);

  if (!confirming) {
    return (
      <IconButton
        ref={trashRef}
        tone="danger"
        label={label}
        icon={<Trash2 className="size-5" strokeWidth={1.75} />}
        onClick={() => setConfirming(true)}
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-danger/10 p-0.5">
      <IconSubmit tone="danger" label={confirmLabel} icon={<Check className="size-5" strokeWidth={2.25} />} autoFocus />
      <IconButton
        label={cancelLabel}
        icon={<X className="size-5" strokeWidth={2} />}
        onClick={() => {
          setConfirming(false);
          // La papelera vuelve a montarse: se le devuelve el foco.
          setTimeout(() => trashRef.current?.focus(), 0);
        }}
      />
    </span>
  );
}
