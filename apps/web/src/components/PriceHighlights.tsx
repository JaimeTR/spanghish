import { useTranslations } from "next-intl";
import { PRICE_VALUES } from "@/lib/prices";
import { PriceItem } from "./PriceItem";

/**
 * Los cuatro precios principales (clase gratis, grupos, mayores, conversación
 * online). Lo usan la home y la página de precios: mismos textos (`prices.*`)
 * y mismas cifras (lib/prices.ts).
 */
export function PriceHighlights() {
  const t = useTranslations("prices");
  const v = (key: string) => t(key, PRICE_VALUES);

  return (
    <ul className="mt-12 grid border-t-2 border-ink md:grid-cols-2 lg:grid-cols-4">
      <PriceItem highlight amount={v("free.amount")} title={v("free.title")} body={v("free.body")} />
      <PriceItem pre={v("groups.from")} amount={v("groups.amount")} unit={v("groups.unit")} title={v("groups.title")} />
      <PriceItem amount={v("mature.amount")} unit={v("mature.unit")} title={v("mature.title")} body={v("mature.body")} />
      <PriceItem amount={v("online.amount")} unit={v("online.unit")} title={v("online.title")} body={v("online.body")} />
    </ul>
  );
}
