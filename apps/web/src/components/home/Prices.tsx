import { useTranslations } from "next-intl";
import { Bubble, SectionQuestion } from "../Bubble";
import { btnPrimary, container } from "../styles";

/**
 * Solo los precios publicados en la web actual. Sin calendario de grupos (las
 * fechas publicadas están vencidas): se invita a preguntar.
 */
export function Prices() {
  const t = useTranslations("prices");

  return (
    <section id="prices" aria-labelledby="prices-title" className="bg-cream py-20 lg:py-28">
      <div className={container}>
        <div className="flex flex-col items-start gap-4">
          <SectionQuestion id="prices-title" tone="fuchsia" tail="left">
            {t("question")}
          </SectionQuestion>
          <p className="text-lg text-ink-muted">{t("intro")}</p>
        </div>

        <ul className="mt-12 grid border-t-2 border-ink md:grid-cols-2 lg:grid-cols-4">
          <PriceItem
            highlight
            amount={t("free.amount")}
            title={t("free.title")}
            body={t("free.body")}
          />
          <PriceItem
            pre={t("groups.from")}
            amount={t("groups.amount")}
            unit={t("groups.unit")}
            title={t("groups.title")}
          />
          <PriceItem
            amount={t("mature.amount")}
            unit={t("mature.unit")}
            title={t("mature.title")}
            body={t("mature.body")}
          />
          <PriceItem
            amount={t("online.amount")}
            unit={t("online.unit")}
            title={t("online.title")}
            body={t("online.body")}
          />
        </ul>

        <Bubble tone="yellow" tail="right" shadow className="mt-14 md:ml-auto md:max-w-[40rem]" boxClassName="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h3 className="font-display text-[1.75rem] leading-tight text-brand-burgundy">{t("groupsAskTitle")}</h3>
            <p className="mt-1 leading-relaxed text-ink">{t("groupsAskBody")}</p>
          </div>
          <a href="#contact" className={`${btnPrimary} shrink-0`}>
            {t("groupsAskCta")}
          </a>
        </Bubble>
      </div>
    </section>
  );
}

function PriceItem({
  amount,
  title,
  body,
  pre,
  unit,
  highlight = false,
}: {
  amount: string;
  title: string;
  body?: string;
  pre?: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex flex-col gap-2 border-b-2 border-ink/15 py-7 md:pr-6 lg:border-b-0 lg:border-l-2 lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
      <h3 className="order-2 text-lg font-extrabold text-ink">{title}</h3>
      <p className="order-1 flex flex-wrap items-baseline gap-x-2 text-brand-fuchsia">
        {pre && <span className="font-semibold text-ink-muted">{pre}</span>}
        <span
          className={`font-display leading-none ${
            highlight ? "lettering text-[clamp(3rem,6vw,4rem)]" : "text-[clamp(3rem,6vw,4rem)] text-brand-purple"
          }`}
        >
          {amount}
        </span>
        {unit && <span className="font-semibold text-ink-muted">{unit}</span>}
      </p>
      {body && <p className="order-3 leading-relaxed text-ink-muted">{body}</p>}
    </li>
  );
}
