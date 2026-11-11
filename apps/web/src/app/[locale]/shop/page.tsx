import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Bubble, SectionQuestion } from "@/components/Bubble";
import { FreeLessonBand } from "@/components/FreeLessonBand";
import { ArrowIcon } from "@/components/icons";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { ProductCard } from "@/components/shop/ProductCard";
import { Steps } from "@/components/Steps";
import { btnInk, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";
import { getShopProducts } from "@/lib/shop-source";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "shop", "shop");
}

const HOW = ["add", "pay", "email"] as const;

/**
 * Tienda de materiales: los tres productos reales de la tienda anterior, con
 * carrito (en el navegador) y pago en Stripe Checkout. La entrega de los
 * archivos es manual (Maribel los envía por email): ver lib/shop.ts.
 * JSON-LD: solo migas. Sin Product/Offer: faltan datos (formato, descripción
 * definitiva de uno de ellos) y los pagos pueden no estar activos todavía.
 */
export default async function ShopPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const products = await getShopProducts();

  const t = await getTranslations({ locale, namespace: "page.shop" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const crumbs = await crumbsJsonLd(locale, [
    { route: "resources", name: tn("resources") },
    { route: "shop", name: tn("shop") },
  ]);
  const buttons = heroButtons("burgundy");

  return (
    <PageShell locale={locale} route="shop" jsonLd={[crumbs]}>
      <PageHero
        tone="burgundy"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("resources"), href: localePath(locale, "resources") },
          { label: tn("shop"), href: localePath(locale, "shop") },
        ]}
        titleA={t("titleA")}
        titleB={t("titleB")}
        lead={<p>{t("lead")}</p>}
        actions={
          <>
            <a href="#products" className={buttons.primary}>
              {t("toProducts")}
              <ArrowIcon />
            </a>
            <Link href={localePath(locale, "learn")} className={buttons.secondary}>
              {tn("learn")}
            </Link>
          </>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="yellow" />}
      />

      <section id="products" aria-labelledby="products-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <SectionQuestion id="products-title" tone="fuchsia">
            {t("question")}
          </SectionQuestion>
          <ul className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product.id} className="flex">
                <ProductCard product={product} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="how-title" className="bg-brand-yellow py-20 lg:py-24">
        <div className={`${container} grid gap-12 lg:grid-cols-12`}>
          <div className="lg:col-span-7">
            <SectionQuestion id="how-title" tone="white">
              {t("howTitle")}
            </SectionQuestion>
            <div className="mt-12">
              <Steps stacked items={HOW.map((key) => ({ key, title: t(`how.${key}`), body: "" }))} />
            </div>
          </div>
          <div className="lg:col-span-5 lg:self-center">
            <Bubble tone="purple" tail="right" shadow boxClassName="px-6 py-6 sm:px-8">
              <h3 className="font-display text-[1.75rem] leading-tight text-brand-yellow">{t("discount.title")}</h3>
              <p className="mt-3 text-lg leading-relaxed">{t("discount.body")}</p>
              <Link
                href={localePath(locale, "contact")}
                className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-yellow px-6 py-3 font-bold text-ink no-underline transition-colors duration-200 hover:bg-surface"
              >
                {t("discount.cta")}
                <ArrowIcon />
              </Link>
            </Bubble>
          </div>
        </div>
      </section>

      <section aria-labelledby="more-title" className="bg-surface-sunken py-20 lg:py-24">
        <div className={container}>
          <SectionQuestion id="more-title" tone="purple">
            {t("more.question")}
          </SectionQuestion>
          <ul className="mt-12 grid gap-x-8 gap-y-2 border-t-2 border-ink md:grid-cols-2">
            {(["learn", "resources"] as const).map((key) => (
              <li key={key}>
                <Link href={localePath(locale, key)} className="block border-b border-ink/15 py-5 no-underline hover:[&>span:first-child]:underline">
                  <span className="flex items-center gap-2 font-display text-[1.75rem] leading-tight text-brand-purple">
                    {t(`more.${key}.title`)}
                    <ArrowIcon />
                  </span>
                  <span className="mt-1 block text-lg text-ink-muted">{t(`more.${key}.body`)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10">
            <Link href={localePath(locale, "resources")} className={btnInk}>
              {tn("allResources")}
            </Link>
          </p>
        </div>
      </section>

      <FreeLessonBand />
    </PageShell>
  );
}
