import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { MockPreview, type MockKind } from "./MockPreview";
import { DevBadge } from "./DevBadge";
import { onLightFocus } from "./shell-styles";

/** Qué esqueleto de ejemplo enseña cada módulo; el resto, una tabla. */
const PREVIEW: Partial<Record<string, MockKind>> = {
  calendar: "calendar",
  schedule: "calendar",
  progress: "chart",
  today: "cards",
  content: "cards",
  resources: "cards",
  courses: "cards",
  children: "cards",
};

export function previewKindFor(module: string): MockKind {
  return PREVIEW[module] ?? "table";
}

/**
 * Página explicativa de un módulo que aún no existe. Sin acceso a datos: solo
 * textos de `devModules.<area>.<module>` y un esqueleto visual de ejemplo.
 */
export async function InDevelopment({
  area,
  module,
  locale,
}: {
  area: AppRole;
  module: string;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: `devModules.${area}.${module}` });
  const tc = await getTranslations({ locale, namespace: "inDevelopment" });
  const bullets = t.raw("bullets") as string[];

  return (
    <>
      <header>
        <DevBadge label={tc("badge")} />
        <h1 className="mt-3 text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-text">{t("title")}</h1>
        <p className="mt-1.5 max-w-[65ch] text-text-muted">{t("summary")}</p>
      </header>

      <section aria-labelledby="dev-what" className="mt-8 rounded-md border border-line bg-surface px-5 py-5">
        <h2 id="dev-what" className="text-base font-semibold text-text">
          {tc("whatYouCanDo")}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-text">
              <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-structure" strokeWidth={2} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <figure className="mt-8">
        <figcaption className="mb-3">
          <span className="block text-base font-semibold text-text">{tc("previewCaption")}</span>
          <span className="block text-sm text-text-muted">{t("previewLabel")}</span>
        </figcaption>
        <MockPreview kind={previewKindFor(module)} />
      </figure>

      <p className="mt-8">
        <Link
          href={`/${locale}/${area}`}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-structure underline-offset-4 hover:underline ${onLightFocus}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {tc("back")}
        </Link>
      </p>
    </>
  );
}
