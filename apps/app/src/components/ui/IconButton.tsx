"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Botones de solo icono. El texto (`label`) no se ve: va como nombre accesible
 * (aria-label, que también lo oyen los lectores de pantalla y las pruebas) y
 * como tooltip (`title`). El icono es decorativo.
 */
export type IconTone = "neutral" | "danger" | "primary";

const tones: Record<IconTone, string> = {
  neutral: "text-text-muted hover:bg-surface-sunken hover:text-text",
  danger: "text-text-muted hover:bg-danger/10 hover:text-danger",
  primary: "text-structure hover:bg-brand-purple/10",
};

const base =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-md transition-colors duration-150 " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function iconButtonClass(tone: IconTone = "neutral", className = ""): string {
  return `${base} ${tones[tone]} ${className}`.trim();
}

type Common = { label: string; icon: ReactNode; tone?: IconTone };

export function IconButton({
  label,
  icon,
  tone = "neutral",
  className,
  type = "button",
  ...rest
}: Common & Omit<ComponentProps<"button">, "children" | "title" | "aria-label">) {
  return (
    <button type={type} aria-label={label} title={label} className={iconButtonClass(tone, className)} {...rest}>
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </button>
  );
}

export function IconLink({
  label,
  icon,
  tone = "neutral",
  className,
  ...rest
}: Common & Omit<ComponentProps<typeof Link>, "children" | "title" | "aria-label">) {
  return (
    <Link aria-label={label} title={label} className={iconButtonClass(tone, className)} {...rest}>
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </Link>
  );
}

/** Botón de envío de un formulario: se desactiva y muestra un indicador mientras la acción corre. */
export function IconSubmit({
  label,
  icon,
  tone = "neutral",
  className,
  disabled,
  ...rest
}: Common & Omit<ComponentProps<"button">, "children" | "title" | "aria-label" | "type">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      disabled={disabled || pending}
      aria-disabled={disabled || pending || undefined}
      className={iconButtonClass(tone, className)}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex">
        {pending ? <LoaderCircle className="size-5 motion-safe:animate-spin" strokeWidth={2} /> : icon}
      </span>
    </button>
  );
}
