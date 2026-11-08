import type { ReactNode } from "react";
import { Bubble } from "./Bubble";

/**
 * Hilo de bocadillos alternos (amarillo / crema, cola a un lado y al otro),
 * pensado para un campo oscuro. Cada bocadillo es un h3 con su texto.
 * `after` añade un elemento final al hilo (p. ej. "Online o presencial").
 */
export function BubbleThread({ items, after }: { items: { key: string; title: string; body: string }[]; after?: ReactNode }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li key={item.key} className={i % 2 ? "self-end sm:pl-16" : "self-start sm:pr-16"}>
          <Bubble tone={i % 2 ? "cream" : "yellow"} tail={i % 2 ? "right" : "left"} boxClassName="px-6 py-4 sm:px-7">
            <h3 className="font-display text-[1.6rem] leading-tight text-brand-burgundy">{item.title}</h3>
            <p className="mt-1 text-[1.0625rem] leading-relaxed text-ink">{item.body}</p>
          </Bubble>
        </li>
      ))}
      {after && <li className="mt-6">{after}</li>}
    </ul>
  );
}

/** Caja de contorno para el final de un hilo sobre campo oscuro. */
export function ThreadNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-on-structure/30 px-6 py-5">
      <h3 className="font-display text-[1.6rem] leading-tight text-brand-yellow">{title}</h3>
      <div className="mt-1 text-[1.0625rem] leading-relaxed">{children}</div>
    </div>
  );
}

/** "70 minutos por clase": la cifra rotulada en amarillo sobre campo oscuro. */
export function MinutesBadge({ minutes, label }: { minutes: string; label: string }) {
  return (
    <div className="flex items-end gap-4">
      <span aria-hidden="true" className="lettering font-display text-[clamp(7rem,22vw,12rem)] leading-[0.8] text-brand-yellow">
        {minutes}
      </span>
      <span className="pb-2 font-display text-[1.75rem] leading-[1.05] text-brand-yellow">
        <span className="sr-only">{minutes} </span>
        {label}
      </span>
    </div>
  );
}
