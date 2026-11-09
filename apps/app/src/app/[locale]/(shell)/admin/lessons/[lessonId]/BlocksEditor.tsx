import Link from "next/link";
import type { LessonBlock } from "@spanglish/content";
import { MoveButtons } from "@/components/content/MoveButtons";
import { getTranslations } from "next-intl/server";
import { moveBlock } from "./block-actions";
import { BlockForm } from "./BlockForm";
import { BlockDelete } from "./BlockDelete";

export async function BlocksEditor({ lessonId, blocks, locale, add, edit }: { lessonId: string; blocks: LessonBlock[]; locale: string; add?: string; edit?: string }) {
  const t = await getTranslations({ locale, namespace: "content.blocks" });
  const kinds = ["text", "image", "video", "quiz"] as const;
  return <section className="mt-10" aria-labelledby="blocks-heading"><h2 id="blocks-heading" className="text-xl font-semibold">{t("heading")}</h2>
    <nav className="mt-3 flex flex-wrap gap-3" aria-label={t("add")}>{kinds.map((kind) => <Link key={kind} className="min-h-11 rounded border border-line px-3 py-2 underline" href={`/${locale}/admin/lessons/${lessonId}?add=${kind}`}>{t(kind)}</Link>)}</nav>
    {add && kinds.includes(add as (typeof kinds)[number]) ? <BlockForm lessonId={lessonId} locale={locale} kind={add as (typeof kinds)[number]} /> : null}
    {!blocks.length ? <p className="mt-4">{t("empty")}</p> : <ol className="mt-4 space-y-4">{blocks.map((block, index) => {
      const label = block.kind === "text" ? block.bodyEs.slice(0, 70) : block.kind === "quiz" ? block.bodyEs : t(block.kind);
      return <li key={block.id} className="rounded border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t(block.kind)} · {label}</h3><div className="flex gap-2"><MoveButtons id={block.id} action={moveBlock} first={index === 0} last={index === blocks.length - 1} labelUp={t("up", { title: label })} labelDown={t("down", { title: label })} locale={locale} /><Link className="inline-flex min-h-11 items-center underline" href={`/${locale}/admin/lessons/${lessonId}?edit=${block.id}#blocks-heading`}>{t("edit")}</Link><BlockDelete locale={locale} lessonId={lessonId} blockId={block.id} /></div></div>{edit === block.id ? <BlockForm lessonId={lessonId} locale={locale} kind={block.kind} block={block} /> : null}</li>;
    })}</ol>}
  </section>;
}
