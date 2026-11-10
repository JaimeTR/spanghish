import { ArrowLeft, Check } from "lucide-react";
import { Figtree, Lilita_One } from "next/font/google";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties } from "react";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { onLightFocus } from "@/components/shell-styles";
import { isLocale } from "@/i18n/routing";
import { webUrl } from "@/lib/web-url";

// Las mismas familias que la web pública: Lilita One para rotular, Figtree para el texto.
const display = Lilita_One({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-lilita", display: "swap" });
const body = Figtree({ subsets: ["latin", "latin-ext"], variable: "--font-figtree", display: "swap" });

const tilt = (deg: number) => ({ "--tilt": `${deg}deg` }) as CSSProperties;

/**
 * Marco de las pantallas de acceso (iniciar sesión, recuperar y restablecer):
 * panel de marca a la izquierda en escritorio, tarjeta clara a la derecha y, en
 * móvil, una sola columna con formas suaves de fondo. Todo lo decorativo va
 * oculto a los lectores de pantalla y quieto con "reducir movimiento".
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "login" });
  const site = webUrl(locale);
  const points = ["levels", "practice", "languages"] as const;

  return (
    <div className={`${display.variable} ${body.variable} font-[family-name:var(--font-figtree)]`}>
      <main className="min-h-screen bg-cream lg:grid lg:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden overflow-hidden bg-[linear-gradient(150deg,color-mix(in_srgb,var(--brand-yellow)_42%,var(--cream)),var(--cream)_58%,color-mix(in_srgb,var(--brand-fuchsia)_9%,var(--cream)))] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-28 -left-24 size-96 rounded-full bg-brand-yellow/45" />
            <div className="absolute top-[38%] -right-24 size-80 rounded-full border-[40px] border-brand-fuchsia/10" />
            <div className="absolute bottom-[22%] left-[46%] size-5 rounded-full bg-brand-purple/60" />
          </div>

          <Image src="/logo-spanglish.png" alt={t("logoAlt")} width={125} height={99} priority className="relative" />

          <div className="relative max-w-lg">
            <p className="font-[family-name:var(--font-lilita)] text-5xl leading-[1.05] text-ink xl:text-6xl">{t("panel.headline")}</p>
            <p className="mt-5 text-lg text-ink-muted">{t("panel.lead")}</p>
            <ul className="mt-8 space-y-3">
              {points.map((point) => (
                <li key={point} className="flex items-center gap-3 font-semibold text-ink">
                  <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-purple text-white">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  {t(`panel.points.${point}`)}
                </li>
              ))}
            </ul>
          </div>

          <div aria-hidden="true" className="relative mt-10 h-36 select-none">
            <span
              style={tilt(-5)}
              className="float-soft absolute top-1 left-0 rounded-[1.4rem] rounded-bl-md border-2 border-brand-purple bg-surface px-6 py-3 font-[family-name:var(--font-lilita)] text-3xl text-brand-purple shadow-[0_14px_28px_-16px_rgb(89_47_133/0.55)]"
            >
              ¡Hola!
            </span>
            <span
              style={tilt(4)}
              className="float-soft absolute top-14 left-40 rounded-[1.4rem] rounded-br-md bg-brand-yellow px-6 py-3 font-[family-name:var(--font-lilita)] text-3xl text-ink shadow-[0_14px_28px_-16px_rgb(30_18_38/0.5)] [animation-delay:-3s]"
            >
              Hello!
            </span>
          </div>
        </div>

        <div className="relative isolate flex min-h-screen flex-col overflow-hidden px-4 py-5 sm:px-8 lg:py-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 -right-20 size-64 rounded-full bg-brand-yellow/40 lg:hidden" />
            <div className="absolute -bottom-28 -left-24 size-72 rounded-full border-[30px] border-brand-fuchsia/10 lg:hidden" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_srgb,var(--brand-purple)_11%,transparent)_1px,transparent_0)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
          </div>

          <header className="flex items-center justify-between gap-3">
            {site ? (
              <a
                href={site}
                className={`inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-structure hover:bg-surface-sunken ${onLightFocus}`}
              >
                <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2.25} />
                {t("backToSite")}
              </a>
            ) : (
              <span />
            )}
            <LocaleSwitch locale={locale} />
          </header>

          <div className="m-auto w-full max-w-md py-8">
            <Image src="/logo-spanglish.png" alt={t("logoAlt")} width={88} height={70} priority className="mx-auto mb-6 lg:hidden" />
            <div className="rounded-lg border border-line bg-surface p-6 shadow-[0_28px_56px_-30px_rgb(89_47_133/0.5)] sm:p-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
