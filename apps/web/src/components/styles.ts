// Enlaces con aspecto de botón (la web pública navega con <a>, no con <button>).
// Mínimo 48px de alto: objetivo táctil holgado sobre los 44px de WCAG 2.2.
const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-[1.0625rem] font-bold leading-tight no-underline transition-[background-color,color,transform] duration-200 ease-out active:translate-y-px";

export const btnPrimary = `${base} bg-primary text-on-primary hover:bg-primary-hover`;
export const btnInk = `${base} border-2 border-ink text-ink hover:bg-ink hover:text-cream`;
export const btnOnDark = `${base} bg-brand-yellow text-ink hover:bg-surface`;
export const btnOnDarkOutline = `${base} border-2 border-current hover:bg-surface hover:text-ink`;

export const container = "mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-10";
