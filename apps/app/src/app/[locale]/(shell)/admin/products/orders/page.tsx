import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { formatAud } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";

/** Pedidos pagados de la tienda (solo lectura). El enlace de descarga de cada comprador no se muestra. */
export default async function ShopOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "products.orders" });
  const { data, error } = await (await createClient())
    .from("shop_orders")
    .select("id, email, total_cents, currency, created_at, expires_at, shop_order_items(name, amount_cents)")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`shop_orders: ${error.code}`);

  const columns: DataColumn[] = [
    { id: "date", header: t("columns.date"), sortable: true, rowHeader: true },
    { id: "email", header: t("columns.email"), sortable: true },
    { id: "items", header: t("columns.items") },
    { id: "total", header: t("columns.total"), sortable: true },
    { id: "expires", header: t("columns.expires"), sortable: true },
  ];

  const rows: DataRow[] = data.map((o) => {
    const items = o.shop_order_items.map((i) => i.name).join(", ");
    const total = `${formatAud(o.total_cents)} ${o.currency.toUpperCase()}`;
    return {
      id: o.id,
      values: {
        date: o.created_at,
        email: o.email ?? "",
        items,
        total: String(o.total_cents).padStart(9, "0"),
        expires: o.expires_at,
      },
      searchText: `${o.email ?? ""} ${items}`,
      cells: {
        date: formatInstant(o.created_at, locale),
        email: o.email ?? "—",
        items: <span className="block max-w-80">{items}</span>,
        total,
        expires: formatInstant(o.expires_at, locale),
      },
      card: (
        <>
          <p className="font-semibold text-text">{o.email ?? "—"}</p>
          <p className="text-sm text-text-muted">
            {formatInstant(o.created_at, locale)} · {total}
          </p>
          <p className="mt-1 text-sm text-text">{items}</p>
        </>
      ),
    };
  });

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} back={{ href: `/${locale}/admin/products`, label: t("back") }} />
      {data.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "date", dir: "desc" }} />
      )}
    </>
  );
}
