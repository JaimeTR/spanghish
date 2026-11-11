import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { parsePurchases } from "@/lib/purchases";
import { localePath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { LoginLinkForm } from "./LoginLinkForm";
import { signOutCustomer } from "./actions";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "myPurchases", "myPurchases");
}

export const dynamic = "force-dynamic";

/** "Mis compras": acceso con enlace al correo (sin contraseña) y descargas de lo comprado. */
export default async function MyPurchasesPage({ params, searchParams }: PageProps & { searchParams: Promise<{ error?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { error } = await searchParams;
  const t = await getTranslations({ locale, namespace: "page.myPurchases" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const buttons = heroButtons("purple");

  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const purchases = supabase && user ? parsePurchases((await supabase.rpc("my_shop_purchases")).data) : [];
  const money = new Intl.NumberFormat(locale === "es" ? "es-AU" : "en-AU", { style: "currency", currency: "AUD" });
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-AU" : "en-AU", { dateStyle: "long" });

  return (
    <PageShell locale={locale} route="myPurchases">
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("shop"), href: localePath(locale, "shop") },
          { label: t("crumb"), href: localePath(locale, "myPurchases") },
        ]}
        titleA={t("title")}
        lead={<p>{user ? t("leadIn") : t("leadOut")}</p>}
        actions={
          <Link href={localePath(locale, "shop")} className={buttons.primary}>
            {t("backShop")}
          </Link>
        }
      />
      <section aria-label={t("title")} className="bg-cream py-14">
        <div className={container}>
          {user ? (
            <>
              {purchases.length === 0 ? <p className="max-w-[60ch] text-lg text-ink">{t("empty")}</p> : null}
              <ul className="flex flex-col gap-6">
                {purchases.map((o) => (
                  <li key={o.id} className="rounded-2xl border-2 border-ink bg-white p-5">
                    <p className="font-semibold text-ink">
                      {date.format(new Date(o.createdAt))} · {money.format(o.totalCents / 100)}
                    </p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-ink">{i.name}</span>
                          {i.hasFile ? (
                            <a href={`/api/my-downloads/${i.id}`} className={buttons.primary}>
                              {t("download")}
                            </a>
                          ) : (
                            <span className="text-sm text-ink/70">{t("noFile")}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <form action={signOutCustomer} className="mt-8">
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="inline-flex min-h-11 items-center font-bold text-brand-burgundy underline decoration-2 underline-offset-4">
                  {t("signOut")}
                </button>
              </form>
            </>
          ) : (
            <>
              {error === "link" ? <p role="alert" className="mb-4 font-semibold text-brand-burgundy">{t("linkError")}</p> : null}
              <p className="mb-5 max-w-[60ch] text-ink">{t("howItWorks")}</p>
              <LoginLinkForm
                locale={locale}
                buttonClass={buttons.primary}
                labels={{ email: t("email"), submit: t("send"), sent: t("sent"), invalid: t("invalid"), failed: t("failed") }}
              />
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
