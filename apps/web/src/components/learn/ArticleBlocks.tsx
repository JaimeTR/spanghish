import Image from "next/image";
import { Fragment } from "react";
import { parseTextBlock, type InlinePart, type LessonBlock } from "@spanglish/content";
import { contentMediaUrl } from "@/lib/platform";
import { VIDEOS } from "@/lib/videos";
import { VideoCard } from "../VideoCard";
import { QuizBlock, type QuizLabels } from "./QuizBlock";

export type ArticleLabels = { play: string; videoTitle: string; quiz: QuizLabels };

/** Texto con negritas: siempre nodos de texto de React, nunca HTML. */
function Inline({ parts }: { parts: InlinePart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.bold ? <strong key={index}>{part.text}</strong> : <Fragment key={index}>{part.text}</Fragment>,
      )}
    </>
  );
}

/**
 * Bloques de una lección artículo escrita en la administración: texto (párrafos,
 * listas y negritas), imagen, video y pregunta. Lo que escribe la administración
 * se pinta como texto: no se interpreta HTML en ningún bloque.
 */
export function ArticleBlocks({
  blocks,
  locale,
  labels,
  mediaUrl = contentMediaUrl,
}: {
  blocks: readonly LessonBlock[];
  locale: "es" | "en";
  labels: ArticleLabels;
  mediaUrl?: (path: string) => string | null;
}) {
  const es = locale === "es";
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block) => {
        if (block.kind === "text") {
          return (
            <div key={block.id} className="flex flex-col gap-4 text-lg leading-relaxed text-ink">
              {parseTextBlock(es ? block.bodyEs : block.bodyEn).map((node, index) =>
                node.type === "p" ? (
                  <p key={index} className="whitespace-pre-line">
                    <Inline parts={node.parts} />
                  </p>
                ) : (
                  <ul key={index} className="flex list-disc flex-col gap-1.5 pl-6 marker:text-brand-fuchsia">
                    {node.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <Inline parts={item} />
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          );
        }
        if (block.kind === "image") {
          const src = mediaUrl(block.imagePath);
          if (!src) return null;
          return (
            <Image
              key={block.id}
              src={src}
              alt={es ? block.altEs : block.altEn}
              width={block.imageWidth}
              height={block.imageHeight}
              unoptimized
              className="h-auto max-w-full rounded-[1.5rem]"
            />
          );
        }
        if (block.kind === "video") {
          return (
            <VideoCard
              key={block.id}
              id={block.youtubeId}
              title={labels.videoTitle}
              playLabel={labels.play}
              sizes="(min-width: 768px) 44rem, 100vw"
              thumbnail={VIDEOS.some((video) => video.id === block.youtubeId)}
            />
          );
        }
        // Los juegos interactivos viven en el portal del alumnado; la web pública no los muestra.
        if (block.kind === "game") return null;
        return (
          <QuizBlock
            key={block.id}
            prompt={es ? block.bodyEs : block.bodyEn}
            options={es ? block.optionsEs : block.optionsEn}
            correctOption={block.correctOption}
            explanation={es ? block.explanationEs : block.explanationEn}
            labels={labels.quiz}
          />
        );
      })}
    </div>
  );
}
