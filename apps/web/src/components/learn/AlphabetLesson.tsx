"use client";

import { useState } from "react";
import { ALPHABET, CONSONANTS, GROUPS, SPANISH_SUMMARY, SPECIAL_RULES, TIPS, TIPS_TITLE, UNIQUE_LETTERS, VOWELS } from "@/lib/learn/alphabet-data";
import { Emoji, LessonSection, SpanishSummary, Speaker, Tips } from "./ui";

/**
 * "The Spanish Alphabet" (lección copiada de la web anterior): abecedario
 * interactivo con la letra elegida, vocales y consonantes, letras especiales y
 * consejos. Contenido en inglés; el español va con lang="es".
 */
export function AlphabetLesson() {
  const [selected, setSelected] = useState(0);
  const item = ALPHABET[selected]!;

  return (
    <div lang="en">
      <LessonSection id="alphabet" title="The Interactive Alphabet" tone="fuchsia">
        <div className="grid gap-8 lg:grid-cols-12">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] content-start gap-2 lg:col-span-7">
            {ALPHABET.map((l, i) => {
              const active = i === selected;
              return (
                <li key={l.letter}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(i)}
                    className={`flex min-h-[4.5rem] w-full flex-col items-center justify-center rounded-2xl px-1 py-2 ring-2 transition-[background-color,transform] duration-150 hover:-translate-y-0.5 active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                      active ? "bg-brand-fuchsia text-on-primary ring-brand-fuchsia" : "bg-surface text-ink ring-ink/12 hover:bg-brand-yellow/40"
                    }`}
                  >
                    <span lang="es" className="font-display text-[1.75rem] leading-none">
                      {l.letter}
                    </span>
                    <span lang="es" className={`mt-1 text-xs font-bold ${active ? "text-on-primary" : "text-ink-muted"}`}>
                      {l.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div aria-live="polite" className="lg:col-span-5">
            <div className="rounded-[1.75rem] bg-surface p-6 ring-1 ring-ink/10" style={{ filter: "drop-shadow(var(--bubble-shadow))" }}>
              <div className="flex items-center gap-4">
                <span lang="es" className="font-display text-[3.5rem] leading-none text-brand-fuchsia">
                  {item.letter}
                </span>
                <span lang="es" className="text-xl font-extrabold text-ink">
                  {item.name}
                </span>
                <Speaker say={item.name} label={item.letter} className="ml-auto" />
              </div>
              <div className="mt-5 border-t-2 border-ink/10 pt-5 text-center">
                <span className="block text-sm font-extrabold tracking-wide text-brand-purple uppercase">Example word</span>
                <span className="mx-auto mt-3 flex size-32 items-center justify-center rounded-2xl bg-brand-purple/8 text-[3.5rem]" role="img" aria-label={item.syllables.join("")}>
                  <Emoji>{item.emoji}</Emoji>
                </span>
                <p lang="es" className="mt-3 text-2xl font-extrabold">
                  {item.syllables.map((s, i) => (
                    <span key={`${s}-${i}`} className={i % 2 ? "text-ink" : "text-brand-purple"}>
                      {s}
                    </span>
                  ))}
                </p>
                <p className="text-ink-muted">({item.english})</p>
              </div>
            </div>
          </div>
        </div>
      </LessonSection>

      <LessonSection
        id="groups"
        title="Vowels and Consonants"
        tone="purple"
        tail="right"
        bg="bg-surface-sunken"
        intro={<p>Spanish has 5 vowels and 22 consonants. They’re all listed below by type.</p>}
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <GroupCard emoji={GROUPS.vowels.emoji} title={GROUPS.vowels.title} text={GROUPS.vowels.text}>
            <LetterChips letters={VOWELS} />
          </GroupCard>
          <GroupCard emoji={GROUPS.consonants.emoji} title={GROUPS.consonants.title} text={GROUPS.consonants.text}>
            <LetterChips letters={CONSONANTS} />
          </GroupCard>
          <GroupCard emoji={GROUPS.unique.emoji} title={GROUPS.unique.title} text={GROUPS.unique.text}>
            <ul className="flex flex-col gap-2">
              {UNIQUE_LETTERS.map((u) => (
                <li key={u.display} className="flex min-h-12 items-center justify-between rounded-xl bg-brand-purple/8 py-1 pr-1 pl-4">
                  <span lang="es" className="text-lg font-extrabold text-brand-purple">
                    {u.display}
                  </span>
                  <Speaker say={u.name} label={u.display} />
                </li>
              ))}
            </ul>
          </GroupCard>
        </div>
      </LessonSection>

      <LessonSection id="special" title="Special Letters" tone="yellow" intro={<p>A few Spanish letters have unique sounds or special rules worth knowing.</p>}>
        <ul className="overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-ink/10">
          {SPECIAL_RULES.map((r) => (
            <li key={r.letter} className="grid gap-3 border-b border-ink/10 px-5 py-5 last:border-0 sm:grid-cols-[5.5rem_1fr] sm:gap-6 sm:px-6">
              <span lang="es" aria-hidden="true" className="font-display text-[2rem] leading-none text-brand-fuchsia">
                {r.letter}
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-ink">{r.title}</h3>
                <p className="mt-1 leading-relaxed text-ink">{r.rule}</p>
                <p className="mt-3 inline-block rounded-xl bg-brand-purple/8 px-3 py-2 font-semibold text-ink">
                  <Emoji>📌 </Emoji>
                  {r.example.map((part, i) =>
                    part.es ? (
                      <span key={i} lang="es" className="font-extrabold">
                        {part.es}
                      </span>
                    ) : (
                      <span key={i}>{part.en}</span>
                    ),
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </LessonSection>

      <section aria-label={TIPS_TITLE} className="bg-surface-sunken py-14 lg:py-20">
        <div className="mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-10">
          <Tips title={TIPS_TITLE} tips={TIPS} />
          <SpanishSummary title={SPANISH_SUMMARY.title} text={SPANISH_SUMMARY.text} />
        </div>
      </section>
    </div>
  );
}

function GroupCard({ emoji, title, text, children }: { emoji: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-[1.75rem] bg-surface p-6 ring-[3px] ring-brand-purple">
      <h3 className="text-xl font-extrabold text-ink">
        <Emoji>{`${emoji} `}</Emoji>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
      <p className="mt-4 leading-relaxed text-ink-muted">{text}</p>
    </div>
  );
}

function LetterChips({ letters }: { letters: readonly string[] }) {
  return (
    <ul lang="es" className="flex flex-wrap gap-2">
      {letters.map((l) => (
        <li key={l} className="rounded-lg bg-brand-purple/8 px-3 py-1 font-extrabold text-ink">
          {l}
        </li>
      ))}
    </ul>
  );
}
