"use client";

import { Button } from "@spanglish/ui";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Botón de envío que se desactiva y cambia de texto mientras la acción corre. */
export function SubmitButton({
  pendingLabel,
  children,
  className,
}: {
  pendingLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
