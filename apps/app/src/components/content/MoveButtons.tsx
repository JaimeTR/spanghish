"use client";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useFormStatus } from "react-dom";
function MoveButton({ direction, label, disabled }: { direction: "up" | "down"; label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="direction" value={direction} aria-label={label} disabled={disabled || pending} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-line focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple">
    {direction === "up" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
  </button>;
}
export function MoveButtons({ id, action, labelUp, labelDown, first, last, locale }: { id: string; action: (formData: FormData) => void | Promise<void>; labelUp: string; labelDown: string; first: boolean; last: boolean; locale?: string }) {
  return <form action={action} className="flex gap-1"><input type="hidden" name="id" value={id} />{locale ? <input type="hidden" name="locale" value={locale} /> : null}<MoveButton direction="up" label={labelUp} disabled={first} /><MoveButton direction="down" label={labelDown} disabled={last} /></form>;
}
