// Estilos del acceso (login, recuperar y restablecer): foco siempre visible y contraste AA.
export const authLabel = "block text-sm font-semibold text-ink";

/** Campo con un icono a la izquierda; el relleno horizontal lo pone quien lo usa (pl-11 pr-3 / pr-24). */
export const authField =
  "block min-h-12 w-full rounded-md border border-line bg-surface py-2 text-text " +
  "placeholder:text-ink-muted/70 transition-colors duration-150 hover:border-ink-muted/40 " +
  "focus-visible:border-brand-purple focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple " +
  "aria-invalid:border-danger";

export const authToggle =
  "absolute top-1/2 right-1.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md " +
  "text-structure transition-colors duration-150 hover:bg-surface-sunken " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple";
