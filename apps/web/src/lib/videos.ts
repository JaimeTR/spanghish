/**
 * Videos de Maribel en YouTube (los de la home actual). Los títulos van tal
 * como están publicados. La miniatura es una copia local en /public/img/videos
 * para no contactar con YouTube hasta que alguien pulsa play.
 */
export const VIDEOS = [
  { id: "GilfeIjZm_g", title: "Personal Pronouns in Spanish" },
  { id: "VSpA7iGcArI", title: "Learn the Regular Verbs in Spanish, Never Explained Better!" },
  { id: "4Wrww413fvA", title: "Definite Articles in Spanish El, La, Los, Las and how to use them!" },
] as const;

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeEmbedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
