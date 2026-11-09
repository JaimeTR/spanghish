import "server-only";
import type { Locale } from "@/i18n/routing";
import type { LevelRow } from "@/lib/data/catalog";
import type { Tables } from "@spanglish/db";
import type { Option } from "./ProgramForm";

/** Opciones de idioma y nivel en el idioma de la interfaz. */
export function languageOptions(languages: Tables<"languages">[], locale: Locale): Option[] {
  return languages.map((l) => ({ value: l.code, label: locale === "en" ? l.name_en : l.name_es }));
}

export function levelOptions(levels: LevelRow[], languages: Tables<"languages">[], locale: Locale): Option[] {
  const languageName = new Map(languages.map((l) => [l.code, locale === "en" ? l.name_en : l.name_es]));
  return levels.map((l) => ({
    value: l.id,
    label: `${languageName.get(l.language_code) ?? l.language_code} · ${locale === "en" ? l.name_en : l.name_es}`,
  }));
}
