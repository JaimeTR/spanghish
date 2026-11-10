"use client";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useFormStatus } from "react-dom";
import { iconButtonClass } from "@/components/ui/IconButton";
function MoveButton({ direction, label, disabled }: { direction: "up" | "down"; label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="direction" value={direction} aria-label={label} title={label} disabled={disabled || pending} className={iconButtonClass("neutral")}>
    {direction === "up" ? <ArrowUp aria-hidden="true" className="size-5" strokeWidth={1.75} /> : <ArrowDown aria-hidden="true" className="size-5" strokeWidth={1.75} />}
  </button>;
}
export function MoveButtons({ id, action, labelUp, labelDown, first, last, locale }: { id: string; action: (formData: FormData) => void | Promise<void>; labelUp: string; labelDown: string; first: boolean; last: boolean; locale?: string }) {
  return <form action={action} className="flex gap-0.5"><input type="hidden" name="id" value={id} />{locale ? <input type="hidden" name="locale" value={locale} /> : null}<MoveButton direction="up" label={labelUp} disabled={first} /><MoveButton direction="down" label={labelDown} disabled={last} /></form>;
}
