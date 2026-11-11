"use client";

import { ArrowLeft, Blocks, CircleHelp, GalleryVerticalEnd, Gamepad2, Image as ImageIcon, ListOrdered, PencilLine, Shuffle, ToggleLeft, Type, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import type { GameType } from "@spanglish/content";
import { BlockForm } from "./BlockForm";

type Choice = { kind: "text" | "image" | "video" | "quiz" } | { kind: "game"; gameType: GameType };

const tile =
  "flex min-h-24 flex-col items-start gap-2 rounded-lg border border-line bg-surface p-4 text-left hover:border-structure hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple";
const iconClass = "size-6 text-structure";

const GAME_ICONS: Record<GameType, ReactNode> = {
  match: <Shuffle aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
  fill: <PencilLine aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
  order: <ListOrdered aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
  flashcards: <GalleryVerticalEnd aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
  truefalse: <ToggleLeft aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
};

const BASICS = [
  { kind: "text", icon: <Type aria-hidden="true" className={iconClass} strokeWidth={1.75} /> },
  { kind: "image", icon: <ImageIcon aria-hidden="true" className={iconClass} strokeWidth={1.75} /> },
  { kind: "video", icon: <Video aria-hidden="true" className={iconClass} strokeWidth={1.75} /> },
  { kind: "quiz", icon: <CircleHelp aria-hidden="true" className={iconClass} strokeWidth={1.75} /> },
] as const;

/**
 * Selector de bloque nuevo: primero se elige el tipo (texto, imagen, vídeo,
 * pregunta o uno de los juegos) y después se rellena su formulario.
 */
export function BlockPicker({ lessonId, locale, games }: { lessonId: string; locale: string; games: readonly GameType[] }) {
  const t = useTranslations("content.blocks");
  const tg = useTranslations("content.games");
  const [choice, setChoice] = useState<Choice | null>(null);

  if (choice) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-md px-2 font-semibold text-primary hover:text-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> {t("chooseAnother")}
        </button>
        <h3 className="mb-3 text-lg font-bold text-text">{choice.kind === "game" ? tg(`types.${choice.gameType}`) : t(choice.kind)}</h3>
        <BlockForm lessonId={lessonId} locale={locale} kind={choice.kind} gameType={choice.kind === "game" ? choice.gameType : undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="pick-content">
        <h3 id="pick-content" className="mb-3 flex items-center gap-2 text-base font-bold text-text">
          <Blocks aria-hidden="true" className="size-5" /> {t("groupContent")}
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {BASICS.map((b) => (
            <li key={b.kind}>
              <button type="button" onClick={() => setChoice({ kind: b.kind })} className={`${tile} w-full`}>
                {b.icon}
                <span className="font-semibold text-text">{t(b.kind)}</span>
                <span className="text-sm text-text-muted">{t(`desc.${b.kind}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="pick-games">
        <h3 id="pick-games" className="mb-3 flex items-center gap-2 text-base font-bold text-text">
          <Gamepad2 aria-hidden="true" className="size-5" /> {t("groupGames")}
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {games.map((g) => (
            <li key={g}>
              <button type="button" onClick={() => setChoice({ kind: "game", gameType: g })} className={`${tile} w-full`}>
                {GAME_ICONS[g]}
                <span className="font-semibold text-text">{tg(`types.${g}`)}</span>
                <span className="text-sm text-text-muted">{tg(`hints.${g}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
