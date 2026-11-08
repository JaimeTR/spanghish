import { useTranslations } from "next-intl";
import { VIDEOS } from "@/lib/videos";
import { SectionQuestion } from "../Bubble";
import { container } from "../styles";
import { VideoCard } from "../VideoCard";

/** Videos de Maribel, sobre el campo morado. Se reproducen aquí mismo. */
export function Videos() {
  const t = useTranslations("videos");

  return (
    <section id="videos" aria-labelledby="videos-title" className="on-dark bg-brand-purple py-20 text-on-structure lg:py-28">
      <div className={container}>
        <div className="flex flex-col items-start gap-4">
          <SectionQuestion id="videos-title" tone="yellow">
            {t("question")}
          </SectionQuestion>
          <p className="max-w-[40rem] text-lg leading-relaxed">{t("intro")}</p>
        </div>

        <ul className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((v) => (
            <li key={v.id} id={`video-${v.id}`}>
              <VideoCard
                id={v.id}
                title={v.title}
                playLabel={t("play")}
                sizes="(min-width: 1024px) 24rem, (min-width: 768px) 50vw, 100vw"
              />
              <h3 lang="en" className="mt-6 text-lg leading-snug font-extrabold sm:text-xl">
                {v.title}
              </h3>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
