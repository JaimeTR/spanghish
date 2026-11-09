import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { PublishedResource } from "@spanglish/content";
import { YouTubeFacade } from "./YouTubeFacade";

export function ResourceCard({ resource, locale }: { resource: PublishedResource; locale: Locale }) {
  const t = useTranslations("studentContent.resources");
  const title = locale === "es" ? resource.titleEs : resource.titleEn;
  const summary = locale === "es" ? resource.descriptionEs : resource.descriptionEn;
  const className = "rounded-[var(--shape-lg)] border border-line bg-surface p-5 shadow-sm";

  if (resource.locked) return <article className={`${className} border-l-4 border-l-brand-burgundy`}>
    <p className="text-2xl" aria-hidden="true">🔒</p><h3 className="mt-2 text-lg font-bold">{title}</h3>
    {summary ? <p className="mt-2 text-text-muted">{summary}</p> : null}
    <p className="mt-3 font-semibold">{t("locked")}</p>
    {process.env.NEXT_PUBLIC_WEB_URL ? <a className="mt-3 inline-block min-h-11 rounded bg-brand-fuchsia px-4 py-2 text-white underline focus-visible:outline-[var(--focus-ring)]" href={`${process.env.NEXT_PUBLIC_WEB_URL.replace(/\/$/, "")}/${locale}/bookings`}>{t("booking")}</a> : <p className="mt-3">{t("booking")}</p>}
  </article>;

  return <article className={`${className} border-t-4 border-t-brand-yellow`}>
    {resource.kind === "video" && resource.youtubeId ? <YouTubeFacade youtubeId={resource.youtubeId} title={title} thumbnailUrl={resource.thumbnailPath ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/content-media/${resource.thumbnailPath}` : undefined} playLabel={t("playVideo")} /> : null}
    <h3 className="mt-3 text-lg font-bold">{title}</h3>{summary ? <p className="mt-2 text-text-muted">{summary}</p> : null}
    {resource.kind === "link" && resource.externalUrl ? <a className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-brand-purple underline focus-visible:outline-[var(--focus-ring)]" href={resource.externalUrl} target="_blank" rel="noopener noreferrer">{t("openLink")}<span className="text-sm">({t("newWindow")})</span></a> : null}
    {resource.kind !== "link" && resource.kind !== "video" && resource.hasFile ? <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-purple underline focus-visible:outline-[var(--focus-ring)]" href={`/${locale}/student/resources/${resource.id}/open`}>{t("openFile")}</Link> : null}
  </article>;
}
