"use client";
import { useState } from "react";
export function YouTubeFacade({ youtubeId, title, thumbnailUrl, playLabel }: { youtubeId: string; title: string; thumbnailUrl?: string; playLabel: string }) {
  const [playing, setPlaying] = useState(false);
  if (playing) return <iframe title={title} src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`} loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="aspect-video w-full" />;
  return <div className="relative aspect-video overflow-hidden rounded bg-brand-purple/10">{thumbnailUrl ? <img src={thumbnailUrl} alt="" className="size-full object-cover" /> : null}<button type="button" aria-label={playLabel} onClick={() => setPlaying(true)} className="absolute inset-0 grid place-items-center bg-ink/20 font-semibold text-on-structure"><span className="rounded-full bg-brand-purple px-5 py-3">{playLabel}</span></button><noscript><a href={`https://www.youtube.com/watch?v=${youtubeId}`} className="sr-only">{playLabel}</a></noscript></div>;
}
