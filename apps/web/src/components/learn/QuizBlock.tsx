"use client";

import { useId, useState } from "react";

export type QuizLabels = { check: string; choose: string; correct: string; incorrect: string };

/**
 * Pregunta de opción única de una lección artículo. Se corrige en el navegador
 * (no se guarda nada). El resultado se anuncia con role="status".
 */
export function QuizBlock({
  prompt,
  options,
  correctOption,
  explanation,
  labels,
}: {
  prompt: string;
  options: string[];
  correctOption: number;
  explanation?: string | null;
  labels: QuizLabels;
}) {
  const name = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<"idle" | "choose" | "correct" | "incorrect">("idle");

  return (
    <fieldset className="rounded-[1.5rem] bg-surface p-5 ring-1 ring-ink/10 sm:p-6">
      <legend className="float-left mb-4 w-full text-xl leading-snug font-extrabold text-ink">{prompt}</legend>
      <div className="clear-both grid gap-2">
        {options.map((option, index) => (
          <label
            key={index}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-lg text-ink ring-1 ring-ink/15 transition-colors duration-200 hover:bg-ink/8 has-[:checked]:bg-brand-yellow has-[:checked]:ring-2 has-[:checked]:ring-ink"
          >
            <input
              type="radio"
              name={name}
              value={index}
              checked={selected === index}
              onChange={() => {
                setSelected(index);
                setResult("idle");
              }}
              className="size-5 shrink-0 accent-[var(--brand-purple)]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setResult(selected === null ? "choose" : selected === correctOption ? "correct" : "incorrect")}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 font-bold text-cream transition-colors duration-200 hover:bg-brand-purple"
      >
        {labels.check}
      </button>
      <p role="status" aria-live="polite" className="mt-3 min-h-7 text-lg font-semibold text-ink">
        {result === "choose" && labels.choose}
        {result === "incorrect" && labels.incorrect}
        {result === "correct" && (
          <>
            {labels.correct}
            {explanation ? ` ${explanation}` : ""}
          </>
        )}
      </p>
    </fieldset>
  );
}
