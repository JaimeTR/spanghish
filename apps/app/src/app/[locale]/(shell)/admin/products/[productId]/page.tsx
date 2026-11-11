import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { ProductDelete, ProductPublishButton } from "../ProductButtons";
import { ProductForm } from "../ProductForm";
import { ProductUploads } from "../ProductUploads";

export default async function ProductDetailPage({ params }: { params: Promise<{ locale: string; productId: string }> }) {
  const { locale, productId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) notFound();
  const t = await getTranslations({ locale, namespace: "products" });
  const { data: product } = await (await createClient()).from("products").select("*").eq("id", productId).maybeSingle();
  if (!product) notFound();
  const published = product.status === "published";

  return (
    <>
      <PageHeader
        title={locale === "es" ? product.name_es : product.name_en}
        intro={`${product.slug} · ${t(`status.${product.status}`)}`}
        back={{ href: `/${locale}/admin/products`, label: t("back") }}
        action={<ProductPublishButton id={product.id} locale={locale} published={published} />}
      />
      <Section id="product-data" title={t("sections.data")}>
        <ProductForm locale={locale} product={product} />
      </Section>
      <Section id="product-files" title={t("sections.files")}>
        <p className="mb-4 text-sm text-text-muted">{t("filesIntro")}</p>
        <ProductUploads
          locale={locale}
          productId={product.id}
          coverPath={product.cover_path}
          fileName={product.file_name}
          fileSize={product.file_size_bytes}
        />
      </Section>
      <div className="mt-8">
        <ProductDelete id={product.id} locale={locale} />
      </div>
    </>
  );
}
