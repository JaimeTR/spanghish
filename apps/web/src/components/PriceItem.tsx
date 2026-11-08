import type { ReactNode } from "react";

/**
 * Un precio publicado: cifra rotulada arriba, título (h3) y nota. En el DOM el
 * título va primero para que el lector de pantalla oiga "Primera clase: Gratis".
 * `small` reduce la cifra cuando es una palabra ("Por email").
 */
export function PriceItem({
  amount,
  title,
  body,
  pre,
  unit,
  highlight = false,
  small = false,
  children,
}: {
  amount: string;
  title: string;
  body?: string;
  pre?: string;
  unit?: string;
  highlight?: boolean;
  small?: boolean;
  children?: ReactNode;
}) {
  const size = small ? "text-[clamp(2.1rem,4.4vw,2.75rem)] py-[0.2em]" : "text-[clamp(3rem,6vw,4rem)]";
  return (
    <li className="flex flex-col gap-2 border-b-2 border-ink/15 py-7 md:pr-6 lg:border-b-0 lg:border-l-2 lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
      <h3 className="order-2 text-lg font-extrabold text-ink">{title}</h3>
      <p className="order-1 flex flex-wrap items-baseline gap-x-2 text-brand-fuchsia">
        {pre && <span className="font-semibold text-ink-muted">{pre}</span>}
        <span className={`font-display leading-none ${size} ${highlight ? "lettering" : "text-brand-purple"}`}>{amount}</span>
        {unit && <span className="font-semibold text-ink-muted">{unit}</span>}
      </p>
      {body && <p className="order-3 leading-relaxed text-ink-muted">{body}</p>}
      {children && <div className="order-4 mt-2">{children}</div>}
    </li>
  );
}
