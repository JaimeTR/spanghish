"use client";

import Image from "next/image";
import { useState } from "react";
import { youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/videos";

/**
 * Video de YouTube con "fachada": miniatura local y botón de play. YouTube
 * (dominio sin cookies) solo se carga al pulsar, así la página es rápida y no
 * se contacta con terceros antes de tiempo. Sin JavaScript, el enlace abre el
 * video en YouTube.
 */
export function VideoCard({
  id,
  title,
  playLabel,
  sizes,
  thumbnail = true,
}: {
  id: string;
  title: string;
  playLabel: string;
  sizes: string;
  /** false: video sin copia local de la miniatura (fondo liso, sin contactar con YouTube). */
  thumbnail?: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-[1.75rem] bg-ink"
      style={{ filter: "drop-shadow(var(--bubble-shadow))" }}
    >
      {playing ? (
        <iframe
          src={youtubeEmbedUrl(id)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <a
          href={youtubeWatchUrl(id)}
          rel="noopener noreferrer"
          aria-label={`${playLabel}: ${title}`}
          onClick={(e) => {
            e.preventDefault();
            setPlaying(true);
          }}
          className="group absolute inset-0 block no-underline"
        >
          {thumbnail && (
            <Image
              src={`/img/videos/${id}.jpg`}
              alt=""
              fill
              sizes={sizes}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          )}
          <span aria-hidden="true" className="absolute inset-0 bg-ink/15 transition-colors duration-300 group-hover:bg-ink/0" />
          <span
            aria-hidden="true"
            className="absolute bottom-4 left-4 flex size-14 items-center justify-center rounded-full bg-brand-fuchsia text-brand-yellow shadow-lg transition-transform duration-300 ease-out group-hover:scale-110 sm:size-16 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          >
            <svg viewBox="0 0 24 24" className="ml-0.5 size-6 sm:size-7" fill="currentColor">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
        </a>
      )}
    </div>
  );
}
