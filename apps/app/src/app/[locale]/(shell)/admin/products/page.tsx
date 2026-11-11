import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { buttonLinkClass, PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { CoverThumb } from "@/components/content/Cover";
import { linkClass } from "@/components/form-styles";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { formatAud } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { ProductDelete, ProductPublishIcon } from "./ProductButtons";
import { ProductForm } from "./ProductForm";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "products" });
  const { data, error } = await (await createClient()).from("products").select("*").order("created_at");
  if (error) throw new Error(`products: ${error.code}`);
  const es = locale === "es";
  const href = (id: string) => `/${locale}/admin/products/${id}`;

  const columns: DataColumn[] = [
    { id: "name", header: t("columns.name"), sortable: true, rowHeader: true },
    { id: "price", header: t("columns.price"), sortable: true },
    {
      id: "file",
      header: t("columns.file"),
      filter: {
        options: [
          { value: "yes", label: t("file.yes") },
          { value: "no", label: t("file.no") },
        ],
      },
    },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: (["draft", "published"] as const).map((s) => ({ value: s, label: t(`status.${s}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = data.map((p) => {
    const name = es ? p.name_es : p.name_en;
    const badge = <StatusBadge tone={p.status === "published" ? "success" : "muted"}>{t(`status.${p.status}`)}</StatusBadge>;
    const price = (
      <>
        {formatAud(p.price_cents)}
        {p.compare_at_cents ? <s className="ml-2 text-xs text-text-muted">{formatAud(p.compare_at_cents)}</s> : null}
      </>
    );
    const actions = (
      <RowActions>
        <ProductPublishIcon id={p.id} locale={locale} published={p.status === "published"} />
        <IconLink href={href(p.id)} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
        <ProductDelete id={p.id} locale={locale} />
      </RowActions>
    );
    return {
      id: p.id,
      values: { name, price: String(p.price_cents).padStart(8, "0"), file: p.file_path ? "yes" : "no", status: p.status },
      searchText: `${p.name_es} ${p.name_en} ${p.slug}`,
      cells: {
        name: (
          <span className="flex items-center gap-3">
            <CoverThumb path={p.cover_path} size={44} />
            <Link href={href(p.id)} className={linkClass}>
              {name}
            </Link>
          </span>
        ),
        price,
        file: p.file_path ? t("file.yes") : t("file.no"),
        status: badge,
        actions,
      },
      card: (
        <>
          <div className="flex items-start gap-3">
            <CoverThumb path={p.cover_path} size={56} />
            <div className="min-w-0 flex-1">
              <Link href={href(p.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                {name}
              </Link>
              <p className="text-sm text-text-muted">
                {price} · {p.file_path ? t("file.yes") : t("file.no")}
              </p>
            </div>
            {badge}
          </div>
          <div className="mt-2 border-t border-line pt-2">{actions}</div>
        </>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${locale}/admin/products/orders`} className={buttonLinkClass}>
              {t("ordersLink")}
            </Link>
            <ModalButton label={t("new")} title={t("new")} size="lg" defaultOpen={query.new === "1"}>
              <ProductForm locale={locale} />
            </ModalButton>
          </div>
        }
      />
      {data.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "name" }} />
      )}
    </>
  );
}
