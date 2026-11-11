import { CircleHelp, Gamepad2, Image as ImageIcon, Pencil, Type, Video } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { GAME_TYPES, type LessonBlock } from "@spanglish/content";
import { MoveButtons } from "@/components/content/MoveButtons";
import { ModalButton } from "@/components/ui/Modal";
import { moveBlock } from "./block-actions";
import { BlockDelete } from "./BlockDelete";
import { BlockForm } from "./BlockForm";
import { BlockPicker } from "./BlockPicker";

const ICONS: Record<LessonBlock["kind"], ReactNode> = {
  text: <Type aria-hidden="true" className="size-5" strokeWidth={1.75} />,
  image: <ImageIcon aria-hidden="true" className="size-5" strokeWidth={1.75} />,
  video: <Video aria-hidden="true" className="size-5" strokeWidth={1.75} />,
  quiz: <CircleHelp aria-hidden="true" className="size-5" strokeWidth={1.75} />,
  game: <Gamepad2 aria-hidden="true" className="size-5" strokeWidth={1.75} />,
};

export async function BlocksEditor({ lessonId, blocks, locale }: { lessonId: string; blocks: LessonBlock[]; locale: string }) {
  const t = await getTranslations({ locale, namespace: "content.blocks" });
  const tg = await getTranslations({ locale, namespace: "content.games" });
  const es = locale === "es";

  const summary = (block: LessonBlock): { type: string; text: string } => {
    switch (block.kind) {
      case "text":
        return { type: t("text"), text: (es ? block.bodyEs : block.bodyEn).slice(0, 90) };
      case "quiz":
        return { type: t("quiz"), text: es ? block.bodyEs : block.bodyEn };
      case "game":
        return { type: `${t("game")} · ${tg(`types.${block.gameType}`)}`, text: es ? block.bodyEs : block.bodyEn };
      case "image":
        return { type: t("image"), text: es ? block.altEs : block.altEn };
      case "video":
        return { type: t("video"), text: `youtu.be/${block.youtubeId}` };
    }
  };

  return (
    <section className="mt-10" aria-labelledby="blocks-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="blocks-heading" className="text-xl font-bold text-text">
          {t("heading")} <span className="text-base font-medium text-text-muted">({blocks.length})</span>
        </h2>
        <ModalButton label={t("add")} title={t("add")} size="lg">
          <BlockPicker lessonId={lessonId} locale={locale} games={GAME_TYPES} />
        </ModalButton>
      </div>
      {!blocks.length ? (
        <p className="mt-4 rounded-lg border border-dashed border-line p-6 text-text-muted">{t("empty")}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {blocks.map((block, index) => {
            const { type, text } = summary(block);
            return (
              <li key={block.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-structure">{ICONS[block.kind]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold tracking-wide text-text-muted uppercase">{type}</p>
                  <p className="truncate text-text">{text}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <MoveButtons
                    id={block.id}
                    action={moveBlock}
                    first={index === 0}
                    last={index === blocks.length - 1}
                    labelUp={t("up", { title: text })}
                    labelDown={t("down", { title: text })}
                    locale={locale}
                  />
                  <ModalButton iconOnly label={t("edit")} title={type} icon={<Pencil className="size-5" strokeWidth={1.75} />} size="lg">
                    <BlockForm lessonId={lessonId} locale={locale} kind={block.kind} block={block} />
                  </ModalButton>
                  <BlockDelete locale={locale} lessonId={lessonId} blockId={block.id} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
