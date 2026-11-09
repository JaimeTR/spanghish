"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
export function QuizBlock({ prompt, options, correctOption, explanation }: { prompt: string; options: string[]; correctOption: number; explanation?: string | null }) {
  const t = useTranslations("content.quiz"); const [selected, setSelected] = useState<number | null>(null); const [result, setResult] = useState("");
  return <fieldset className="rounded-lg border border-line p-4"><legend className="px-2 font-semibold">{prompt}</legend><div className="grid gap-2">{options.map((option, index) => <label key={`${option}-${index}`} className="flex min-h-11 items-center gap-3"><input type="radio" name="quiz-answer" value={index} checked={selected === index} onChange={() => { setSelected(index); setResult(""); }} />{option}</label>)}</div><button type="button" className="mt-3 min-h-11 rounded bg-primary px-4 text-on-primary" onClick={() => setResult(selected === correctOption ? `${t("correct")} ${explanation ?? ""}` : selected === null ? t("choose") : t("incorrect"))}>{t("check")}</button><p role="status" aria-live="polite" className="mt-2">{result}</p></fieldset>;
}
