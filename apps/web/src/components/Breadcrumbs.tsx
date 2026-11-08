import Link from "next/link";
import { useTranslations } from "next-intl";

export type Crumb = { label: string; href: string };

/**
 * Migas de pan visibles. El último elemento es la página actual (sin enlace).
 * Hereda el color del campo del hero.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations("nav");
  const last = items.length - 1;

  return (
    <nav aria-label={t("breadcrumb")}>
      <ol className={`flex flex-wrap items-center gap-x-1 text-[0.9375rem] font-semibold`}>
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-x-1">
            {i < last ? (
              <>
                <Link href={item.href} className="inline-flex min-h-11 items-center rounded-sm text-current underline decoration-2 underline-offset-4 hover:decoration-[3px]">
                  {item.label}
                </Link>
                <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 2.5L8 6l-3.5 3.5" />
                </svg>
              </>
            ) : (
              <span aria-current="page" className="inline-flex min-h-11 items-center">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
