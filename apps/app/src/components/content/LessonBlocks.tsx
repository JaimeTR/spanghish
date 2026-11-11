import Image from "next/image";
import { useTranslations } from "next-intl";
import type { LessonBlock } from "@spanglish/content";
import { TextBlock } from "./TextBlock";
import { QuizBlock } from "./QuizBlock";
import { GameBlock } from "./GameBlock";
import { YouTubeFacade } from "./YouTubeFacade";
export function LessonBlocks({ blocks, locale, videoTitle, playLabel }: { blocks: LessonBlock[]; locale: "es" | "en"; videoTitle?: string; playLabel?: string }) {
  const t = useTranslations("content.blocks");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return <div className="space-y-8">{blocks.map((block) => {
    if (block.kind === "text") return <TextBlock key={block.id} body={locale === "es" ? block.bodyEs : block.bodyEn} />;
    if (block.kind === "image") return <Image key={block.id} src={base ? `${base}/storage/v1/object/public/content-media/${block.imagePath}` : block.imagePath} alt={locale === "es" ? block.altEs : block.altEn} width={block.imageWidth} height={block.imageHeight} unoptimized className="h-auto max-w-full" />;
    if (block.kind === "video") return <YouTubeFacade key={block.id} youtubeId={block.youtubeId} title={videoTitle ?? t("videoTitle")} playLabel={playLabel ?? t("playVideo")} />;
    if (block.kind === "game") return <GameBlock key={block.id} blockId={block.id} gameType={block.gameType} items={block.gameData.items} title={locale === "es" ? block.bodyEs : block.bodyEn} />;
    return <QuizBlock key={block.id} prompt={locale === "es" ? block.bodyEs : block.bodyEn} options={locale === "es" ? block.optionsEs : block.optionsEn} correctOption={block.correctOption} explanation={locale === "es" ? block.explanationEs : block.explanationEn} />;
  })}</div>;
}
