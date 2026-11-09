"use client";

import { Button, type ButtonVariant } from "@spanglish/ui";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Botón de envío que se desactiva y cambia de texto mientras la acción corre. */
export function SubmitButton({
  pendingLabel,
  children,
  className,
  variant,
}: {
  pendingLabel: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
