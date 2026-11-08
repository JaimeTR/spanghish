import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "highlight";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 font-semibold " +
  "transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple " +
  "disabled:cursor-not-allowed disabled:opacity-60";

// highlight: amarillo solo como fondo; el texto es siempre --ink.
const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border-2 border-structure bg-transparent text-structure hover:bg-surface-sunken",
  highlight: "bg-highlight text-on-highlight hover:brightness-95",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", type = "button", className, ...rest },
  ref,
) {
  const classes = [base, variants[variant], className].filter(Boolean).join(" ");
  return <button ref={ref} type={type} className={classes} {...rest} />;
});
