"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, type ReactNode } from "react";
import { inputClass } from "@/components/form-styles";
import { tableClass, tdClass, thClass } from "./table-styles";

export type DataColumn = {
  id: string;
  header: string;
  /** Con opciones, la cabecera lleva un filtro desplegable. */
  /** `multi`: el valor de la fila es una lista separada por comas (p. ej. varios roles) y basta con que incluya la opción. */
  filter?: { options: { value: string; label: string }[]; multi?: boolean };
  sortable?: boolean;
  align?: "right";
  /** La primera celda de la fila (el nombre) es el encabezado de fila. */
  rowHeader?: boolean;
};

export type DataRow = {
  id: string;
  /** Valor de texto de cada columna: sirve para ordenar y para filtrar. */
  values: Record<string, string>;
  /** Lo que se pinta en cada celda. */
  cells: Record<string, ReactNode>;
  /** Tarjeta de la vista móvil. */
  card: ReactNode;
  /** Texto en el que busca el buscador; por defecto, todos los valores. */
  searchText?: string;
};

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Tabla de administración con todo en una sola tarjeta: buscador en tiempo real
 * en el encabezado, un filtro por columna que lo necesite y orden al pulsar el
 * título de la columna. Filtra en el navegador (las listas son de unos cientos
 * de filas como mucho), sin recargar la página.
 */
export function DataTable({
  caption,
  columns,
  rows,
  searchLabel,
  defaultSort,
}: {
  caption: string;
  columns: DataColumn[];
  rows: DataRow[];
  searchLabel: string;
  defaultSort: { id: string; dir?: "asc" | "desc" };
}) {
  const t = useTranslations("table");
  const locale = useLocale();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" }>({ id: defaultSort.id, dir: defaultSort.dir ?? "asc" });

  const visible = useMemo(() => {
    const q = norm(query.trim());
    const collator = new Intl.Collator(locale, { numeric: true });
    const first = columns[0]!.id;
    return rows
      .filter((row) => {
        for (const [col, value] of Object.entries(filters)) {
          if (!value) continue;
          const have = row.values[col] ?? "";
          const multi = columns.find((c) => c.id === col)?.filter?.multi;
          if (multi ? !have.split(",").includes(value) : have !== value) return false;
        }
        if (!q) return true;
        return norm(row.searchText ?? Object.values(row.values).join(" ")).includes(q);
      })
      .sort(
        (a, b) =>
          (collator.compare(a.values[sort.id] ?? "", b.values[sort.id] ?? "") ||
            collator.compare(a.values[first] ?? "", b.values[first] ?? "")) * (sort.dir === "desc" ? -1 : 1),
      );
  }, [rows, columns, query, filters, sort, locale]);

  const filterable = columns.filter((c) => c.filter);
  const active = query.trim() !== "" || Object.values(filters).some(Boolean);
  const toggleSort = (id: string) =>
    setSort((s) => (s.id === id ? { id, dir: s.dir === "asc" ? "desc" : "asc" } : { id, dir: "asc" }));

  /** Filtro de una columna: va en la misma fila que el buscador; la primera opción dice a qué columna filtra. */
  const filterSelect = (c: DataColumn) => (
    <select
      key={c.id}
      aria-label={`${t("filterBy")} ${c.header}`}
      value={filters[c.id] ?? ""}
      onChange={(e) => setFilters((f) => ({ ...f, [c.id]: e.target.value }))}
      className={`${inputClass} mt-0 w-auto min-w-36 max-w-56 shrink-0 ${filters[c.id] ? "border-structure font-semibold" : ""}`}
    >
      <option value="">
        {c.header}: {t("all")}
      </option>
      {c.filter!.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <section aria-label={caption} className="mt-8 overflow-hidden rounded-lg border border-line bg-surface">
      <div role="search" className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-56">
            <label htmlFor={searchId} className="sr-only">
              {searchLabel}
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-text-muted" strokeWidth={2} />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={80}
              autoComplete="off"
              placeholder={searchLabel}
              className={`${inputClass} mt-0 pl-10`}
            />
          </div>
          {filterable.map((c) => filterSelect(c))}
          {active ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilters({});
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-primary hover:text-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2.25} />
              {t("clear")}
            </button>
          ) : null}
          <p role="status" className="ml-auto text-sm text-text-muted">
            {t("results", { count: visible.length })}
          </p>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-8 text-text-muted">{t("empty")}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className={tableClass}>
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map((c) => {
                    const isSorted = sort.id === c.id;
                    const Icon = !isSorted ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                    return (
                      <th
                        key={c.id}
                        scope="col"
                        aria-sort={isSorted ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                        className={`${thClass} ${c.align === "right" ? "text-right" : ""}`}
                      >
                        {c.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c.id)}
                            className="inline-flex items-center gap-1.5 rounded-sm uppercase hover:text-text focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
                          >
                            {c.header}
                            <Icon aria-hidden="true" className={`size-3.5 ${isSorted ? "text-structure" : "opacity-60"}`} strokeWidth={2.25} />
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-sunken/40">
                    {columns.map((c) =>
                      c.rowHeader ? (
                        <th key={c.id} scope="row" className={`${tdClass} text-left font-semibold`}>
                          {row.cells[c.id]}
                        </th>
                      ) : (
                        <td key={c.id} className={`${tdClass} ${c.align === "right" ? "text-right" : ""}`}>
                          {row.cells[c.id]}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-3 p-4 md:hidden">
            {visible.map((row) => (
              <li key={row.id} className="rounded-lg border border-line bg-surface p-4">
                {row.card}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
