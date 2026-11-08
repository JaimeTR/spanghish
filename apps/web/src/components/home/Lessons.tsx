import { useTranslations } from "next-intl";
import { SectionQuestion } from "../Bubble";
import { container } from "../styles";

/**
 * Para quién: bloques de color de tamaños distintos (no una fila de tarjetas
 * iguales). La edad, en rotulado grande, es el dato que el visitante busca.
 */
export function Lessons() {
  const t = useTranslations("lessons");

  return (
    <section id="lessons" aria-labelledby="lessons-title" className="bg-cream py-20 lg:py-28">
      <div className={container}>
        <div className="flex flex-col items-start gap-4">
          <SectionQuestion id="lessons-title" tone="yellow">
            {t("question")}
          </SectionQuestion>
          <p className="max-w-[40rem] text-lg leading-relaxed text-ink-muted">{t("intro")}</p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          <Audience
            className="bg-brand-fuchsia text-on-primary sm:col-span-2 lg:col-span-4 lg:row-span-2 lg:min-h-[25rem]"
            age={t("adults.age")}
            title={t("adults.title")}
            body={t("adults.body")}
            big
          />
          <Audience
            className="bg-brand-yellow text-ink lg:col-span-2"
            age={t("kids.age")}
            title={t("kids.title")}
            body={t("kids.body")}
          />
          <Audience
            className="on-dark bg-brand-purple text-on-structure lg:col-span-2"
            age={t("mature.age")}
            title={t("mature.title")}
            body={t("mature.body")}
          />
          <li className="on-dark relative flex flex-col justify-between gap-6 overflow-hidden rounded-lg bg-brand-burgundy p-6 text-on-primary sm:col-span-2 sm:p-8 lg:col-span-6 lg:flex-row lg:items-center">
            <div className="max-w-[36rem]">
              <span className="inline-block rounded-full bg-brand-yellow px-3 py-1 text-sm font-bold text-ink">
                {t("online.tag")}
              </span>
              <h3 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.75rem)] leading-none">{t("online.title")}</h3>
              <p className="mt-3 text-lg leading-relaxed">{t("online.body")}</p>
            </div>
            <ScreenChat />
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed border-ink/25 px-5 py-4 sm:px-6">
          <h3 className="font-bold text-ink">{t("soonLabel")}</h3>
          <ul className="flex flex-wrap gap-2">
            {(["soonDele", "soonAfter"] as const).map((key) => (
              <li key={key} className="rounded-full bg-surface px-3.5 py-1.5 text-[0.9375rem] font-semibold text-ink-muted">
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <h3 className="mt-20 font-display text-[clamp(1.75rem,3.4vw,2.5rem)] leading-none text-brand-purple">
          {t("formatsTitle")}
        </h3>
        <ul className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-3">
          {(["private", "own", "local"] as const).map((key, i) => (
            <li key={key} className="border-t-2 border-ink pt-5">
              <People count={i === 0 ? 1 : i === 1 ? 2 : 5} />
              <h4 className="mt-4 text-xl font-extrabold text-ink">{t(`formats.${key}.title`)}</h4>
              <p className="mt-1.5 leading-relaxed text-ink-muted">{t(`formats.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Audience({
  className,
  age,
  title,
  body,
  big = false,
}: {
  className: string;
  age: string;
  title: string;
  body: string;
  big?: boolean;
}) {
  return (
    <li className={`relative flex flex-col justify-between gap-8 overflow-hidden rounded-lg p-6 sm:p-8 ${className}`}>
      <p
        aria-hidden="true"
        className={`font-display leading-[0.85] ${big ? "text-[clamp(5rem,15vw,10rem)]" : "text-[clamp(4rem,9vw,5.5rem)]"}`}
      >
        {age}
      </p>
      <div>
        <h3 className={`font-display leading-none ${big ? "text-[clamp(2.1rem,4.5vw,3.25rem)]" : "text-[2rem]"}`}>
          {title}
          <span className="sr-only"> ({age})</span>
        </h3>
        <p className={`mt-3 leading-relaxed ${big ? "max-w-[28rem] text-lg sm:text-xl" : "text-base"}`}>{body}</p>
      </div>
    </li>
  );
}

/** Círculos por persona: 1, 2 o un grupo. Geometría, no ilustración. */
function People({ count }: { count: number }) {
  const colors = ["#D71950", "#592F85", "#FCD404", "#8F0831", "#D71950"];
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${count * 26 + 10} 40`} width={count * 26 + 10} height={40} className="block">
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(${i * 26} 0)`}>
          <circle cx="18" cy="12" r="8" fill={colors[i]} />
          <path d="M4 40c0-9 6-15 14-15s14 6 14 15z" fill={colors[i]} />
        </g>
      ))}
    </svg>
  );
}

/** Mini pantalla con dos bocadillos: la conversación, online. */
function ScreenChat() {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 140" className="w-full max-w-[15rem] shrink-0 self-end lg:self-center">
      <rect x="6" y="6" width="208" height="120" rx="16" fill="#FBF7EC" />
      <rect x="6" y="6" width="208" height="22" rx="11" fill="#592F85" />
      <circle cx="22" cy="17" r="4" fill="#FCD404" />
      <circle cx="36" cy="17" r="4" fill="#FBF7EC" opacity=".6" />
      <rect x="22" y="42" width="110" height="28" rx="14" fill="#D71950" />
      <path d="M30 68l-6 12 16-10z" fill="#D71950" />
      <rect x="90" y="82" width="108" height="28" rx="14" fill="#FCD404" />
      <path d="M190 108l6 12-16-10z" fill="#FCD404" />
      <rect x="34" y="52" width="62" height="8" rx="4" fill="#FFFFFF" />
      <rect x="104" y="92" width="72" height="8" rx="4" fill="#1E1226" opacity=".7" />
      <rect x="92" y="126" width="36" height="8" rx="2" fill="#FBF7EC" />
    </svg>
  );
}
