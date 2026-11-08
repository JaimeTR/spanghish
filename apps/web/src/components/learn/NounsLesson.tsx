"use client";

import { Fragment, useId, useState, type ReactNode } from "react";
import {
  ARTICLE_TABLES,
  BAG_MODEL,
  BAG_PLACEHOLDERS,
  CATEGORIES,
  checkBagItem,
  checkPlural,
  EXCEPTIONS,
  FEEDBACK,
  FEMININE_ENDINGS,
  MASCULINE_ENDINGS,
  MCQ,
  NO_RULE,
  PAIRS,
  PLURAL_RULES,
  PLURALS,
  SECTIONS,
  SORT_WORDS,
  SPANISH_SUMMARY,
  TIPS,
  TOTAL_POINTS,
  type Gender,
} from "@/lib/learn/nouns-data";
import { Emoji, Es, LessonSection, SpanishSummary, Speaker, Tips, Word } from "./ui";

const card = "rounded-[1.5rem] bg-surface p-5 ring-1 ring-ink/10";
const h3 = "font-display text-[1.6rem] leading-tight text-ink";
const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 font-bold transition-[background-color,transform] duration-150 hover:-translate-y-0.5 active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const btnSolid = `${btn} bg-brand-purple text-on-structure`;
const btnGhost = `${btn} text-ink ring-2 ring-ink/20 hover:bg-ink/8`;
const GENDER_TAG: Record<Gender, string> = { m: "bg-brand-purple text-on-structure", f: "bg-brand-fuchsia text-on-primary" };
const GENDER_NAME: Record<Gender, string> = { m: "masculine", f: "feminine" };

/**
 * "Spanish Nouns & Articles" (lección copiada de la web anterior): teoría con
 * palabras que se oyen y cuatro ejercicios con puntos (10 + 8 + 8 + 4 = 30).
 * Contenido en inglés; el español va con lang="es".
 */
export function NounsLesson() {
  const [scores, setScores] = useState({ sort: 0, plural: 0, mcq: 0, bag: 0 });
  const total = scores.sort + scores.plural + scores.mcq + scores.bag;
  const setScore = (key: keyof typeof scores) => (value: number) => setScores((s) => (s[key] === value ? s : { ...s, [key]: value }));

  return (
    <div lang="en">
      <nav aria-label="Lesson sections" className="bg-cream pt-10">
        <ul className="mx-auto flex w-full max-w-[76rem] flex-wrap gap-2 px-4 sm:px-6 lg:px-10">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 font-bold text-ink no-underline ring-2 ring-ink/15 transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-brand-yellow/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Emoji>{s.emoji}</Emoji>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <WhatSection />
      <GenderSection />
      <NumberSection />
      <ArticlesSection />

      <section aria-label="Tips to Master Spanish Nouns" className="bg-cream py-14 lg:py-20">
        <div className="mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-10">
          <Tips title="Tips to Master Spanish Nouns" tips={TIPS} />
          <SpanishSummary title={SPANISH_SUMMARY.title} text={SPANISH_SUMMARY.text} />
        </div>
      </section>

      <LessonSection
        id="practice"
        title="Practice Time"
        tone="fuchsia"
        bg="bg-surface-sunken"
        intro={<p>Four activities, from easy to creative. Check your answers as you go — your points are added to the bar below.</p>}
      >
        <Progress total={total} />
        <div className="mt-8 flex flex-col gap-8">
          <SortExercise onScore={setScore("sort")} />
          <PluralExercise onScore={setScore("plural")} />
          <ChoiceExercise onScore={setScore("mcq")} />
          <BagExercise onScore={setScore("bag")} />
        </div>
      </LessonSection>
    </div>
  );
}

/* ---------------------------------------------------------------- Teoría */

function WhatSection() {
  return (
    <LessonSection
      id="what"
      title="What is a Noun?"
      tone="purple"
      intro={
        <p>
          A <strong>noun</strong> (<Es>un sustantivo</Es>) is a word that names a <strong>person, an animal, a place, a thing or an idea</strong>. Tap 🔊 to hear each word
          in Spanish.
        </p>
      }
    >
      <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((c) => (
          <li key={c.word} className={`${card} flex flex-col items-start gap-1`}>
            <Emoji className="text-4xl">{c.emoji}</Emoji>
            <span className="mt-1 text-sm font-bold tracking-wide text-brand-purple uppercase">
              {c.label} · <Es>{c.es}</Es>
            </span>
            <Es className="font-display text-2xl leading-tight text-ink">{c.word}</Es>
            <span className="text-ink-muted">{c.en}</span>
            <Speaker say={c.word} className="mt-2" />
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-[48rem] rounded-[1.25rem] bg-brand-yellow px-5 py-4 text-lg leading-relaxed text-ink">
        <Emoji>✨ </Emoji>In Spanish, every noun has a <strong>gender</strong> (masculine or feminine) and a <strong>number</strong> (singular or plural) — even objects
        like a table or a phone! The little word in front (<Es>el</Es>, <Es>la</Es>…) is the <strong>article</strong>, and it tells you the gender.
      </p>
    </LessonSection>
  );
}

function EndingColumn({ gender, articles, endings }: { gender: Gender; articles: string; endings: typeof MASCULINE_ENDINGS }) {
  return (
    <div className="rounded-[1.5rem] bg-surface ring-1 ring-ink/10">
      <h3 className={`flex items-baseline justify-between gap-3 rounded-t-[1.5rem] px-5 py-3 font-display text-[1.6rem] leading-tight ${GENDER_TAG[gender]}`}>
        {gender === "m" ? "Masculine" : "Feminine"}
        <Es className="font-sans text-lg font-bold">{articles}</Es>
      </h3>
      <ul className="divide-y divide-ink/10">
        {endings.map((e) => (
          <li key={e.ending} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center">
            <Es className={`w-36 shrink-0 font-display text-xl ${gender === "m" ? "text-brand-purple" : "text-brand-fuchsia"}`}>{e.ending}</Es>
            <span className="flex flex-wrap gap-2">
              {e.words.map((w) => (
                <Word key={w.word} text={w.word} emoji={w.emoji} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniWord({ emoji, word, gender, note }: { emoji: string; word: string; gender: Gender; note?: ReactNode }) {
  return (
    <li className={`${card} flex items-center gap-3 p-3`}>
      <Emoji className="text-2xl">{emoji}</Emoji>
      <span className="min-w-0 flex-1">
        <Es className="block font-extrabold text-ink">{word}</Es>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className={`rounded-full px-2 py-0.5 font-bold ${GENDER_TAG[gender]}`}>{GENDER_NAME[gender]}</span>
          {note && <span className="text-ink-muted">{note}</span>}
        </span>
      </span>
      <Speaker say={word} />
    </li>
  );
}

function GenderSection() {
  return (
    <LessonSection
      id="gender"
      title="Gender: Masculine & Feminine"
      tone="yellow"
      tail="right"
      bg="bg-surface-sunken"
      intro={
        <p>
          Unlike English, all Spanish nouns are either <strong>masculine</strong> or <strong>feminine</strong>. This is a grammar category, not a real one — a table isn’t
          “female”! The good news: the ending of the word usually gives you a clue.
        </p>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <EndingColumn gender="m" articles="el · un" endings={MASCULINE_ENDINGS} />
        <EndingColumn gender="f" articles="la · una" endings={FEMININE_ENDINGS} />
      </div>

      <h3 className={`${h3} mt-12`}>
        <Emoji>🤔 </Emoji>Endings in -e or a consonant: no fixed rule
      </h3>
      <p className="mt-3 max-w-[44rem] text-lg leading-relaxed text-ink">
        Some nouns end in <strong>-e</strong> or a <strong>consonant</strong> (-l, -r, -z…). They can be masculine or feminine, so learn them together with their{" "}
        <strong>article</strong>.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NO_RULE.map((w) => (
          <MiniWord key={w.word} {...w} />
        ))}
      </ul>

      <h3 className={`${h3} mt-12`}>
        <Emoji>⚠️ </Emoji>Watch out! Common exceptions
      </h3>
      <p className="mt-3 max-w-[44rem] text-lg leading-relaxed text-ink">
        These everyday words break the <strong>-o / -a</strong> rule. Learners use them all the time, so memorise them early!
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXCEPTIONS.map((w) => (
          <MiniWord
            key={w.word}
            emoji={w.emoji}
            word={w.word}
            gender={w.gender}
            note={
              <>
                {w.note.en}
                {"es" in w.note && <Es>{w.note.es}</Es>}
              </>
            }
          />
        ))}
      </ul>

      <h3 className={`${h3} mt-12`}>
        <Emoji>👫 </Emoji>People and animals
      </h3>
      <p className="mt-3 max-w-[44rem] text-lg leading-relaxed text-ink">
        For people and many animals, the gender follows the real person or animal. Often you just change <strong>-o → -a</strong> or add <strong>-a</strong>. Some words
        stay the same and <strong>only the article changes</strong>.
      </p>
      <ul className="mt-5 grid gap-3 lg:grid-cols-2">
        {PAIRS.map(([a, b]) => (
          <li key={a.word} className={`${card} flex flex-wrap items-center gap-2 p-3`}>
            <Word text={a.word} emoji={a.emoji} />
            <span aria-hidden="true" className="font-extrabold text-brand-fuchsia">
              →
            </span>
            <Word text={b.word} emoji={b.emoji} />
          </li>
        ))}
      </ul>
    </LessonSection>
  );
}

function NumberSection() {
  return (
    <LessonSection
      id="number"
      title="Number: Singular & Plural"
      tone="burgundy"
      intro={
        <p>
          To talk about more than one thing, we make the noun <strong>plural</strong>. Remember: the article changes too — <Es>el → los</Es> and <Es>la → las</Es>.
        </p>
      }
    >
      <ol className="grid gap-4 lg:grid-cols-2">
        {PLURAL_RULES.map((r, i) => (
          <li key={r.title.rule} className={card}>
            <h3 className="flex items-start gap-3 text-lg font-extrabold text-ink">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-fuchsia font-display text-xl text-on-primary">
                {i + 1}
              </span>
              <span>
                <span className="sr-only">{i + 1}. </span>
                {r.title.lead}
                <span className="text-brand-burgundy">{r.title.rule}</span>
              </span>
            </h3>
            <ul className="mt-4 flex flex-col gap-2">
              {r.examples.map((ex) => (
                <li key={ex.singular} className="flex flex-wrap items-center gap-2">
                  <Word text={ex.singular} emoji={ex.emoji} />
                  <span aria-hidden="true" className="font-extrabold text-brand-fuchsia">
                    →
                  </span>
                  <Word text={`${ex.stem}${ex.end}`}>
                    {ex.stem}
                    {ex.end && <span className="text-brand-fuchsia underline decoration-2 underline-offset-4">{ex.end}</span>}
                  </Word>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </LessonSection>
  );
}

function ArticlesSection() {
  return (
    <LessonSection
      id="articles"
      title="Meet the Articles"
      tone="purple"
      tail="right"
      bg="bg-surface-sunken"
      intro={
        <p>
          Articles are the small words that go <strong>before a noun</strong>. In Spanish they must match the noun in <strong>gender</strong> (masculine / feminine) and{" "}
          <strong>number</strong> (singular / plural). There are two families:
        </p>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {ARTICLE_TABLES.map((table) => (
          <div key={table.title} className={card}>
            <h3 className={h3}>{table.title}</h3>
            <p className="mt-1 text-ink-muted">{table.meaning}</p>
            <table className="mt-4 w-full table-fixed border-separate border-spacing-1.5 text-left">
              <thead>
                <tr>
                  <td className="w-[4.75rem]" />
                  <th scope="col" className="rounded-lg bg-brand-purple px-2 py-1.5 text-sm font-bold text-on-structure">
                    Masculine
                  </th>
                  <th scope="col" className="rounded-lg bg-brand-fuchsia px-2 py-1.5 text-sm font-bold text-on-primary">
                    Feminine
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="text-sm font-bold text-ink">
                      {row.label}
                    </th>
                    {[row.m, row.f].map((cell) => (
                      <td key={cell.article} className="rounded-lg bg-cream px-2 py-2 align-top">
                        <Es className="block font-display text-2xl leading-none text-ink">{cell.article}</Es>
                        <span className="mt-1 block text-sm text-ink">
                          <Es>{cell.example}</Es> <Emoji>{cell.emoji}</Emoji>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] bg-brand-yellow p-5 sm:flex-row sm:items-start">
        <Emoji className="text-3xl">🗨️</Emoji>
        <div className="text-lg leading-relaxed text-ink">
          <p>
            <Es className="font-extrabold">Tengo un perro. El perro se llama Max.</Es> — I have a dog. The dog is called Max.
          </p>
          <p className="mt-1">
            First we introduce it with <Es className="font-bold">un</Es>; after that, we both know which dog, so we use <Es className="font-bold">el</Es>.
          </p>
        </div>
        <Speaker say="Tengo un perro. El perro se llama Max." label="Tengo un perro. El perro se llama Max." className="sm:ml-auto" />
      </div>

      <h3 className={`${h3} mt-12`}>
        <Emoji>🌟 </Emoji>Three special cases
      </h3>
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        <li className={card}>
          <Emoji className="text-3xl">👨‍👩‍👧‍👦</Emoji>
          <h4 className="mt-2 text-lg font-extrabold text-ink">Mixed groups → masculine</h4>
          <p className="mt-1 leading-relaxed text-ink">
            A group of men and women uses the masculine plural: <Es className="font-bold">los padres</Es> = mum and dad; <Es className="font-bold">los niños</Es> = boys and girls.
          </p>
        </li>
        <li className={card}>
          <Emoji className="text-3xl">💧</Emoji>
          <h4 className="mt-2 text-lg font-extrabold text-ink">
            <Es>el agua</Es> (but feminine!)
          </h4>
          <p className="mt-1 leading-relaxed text-ink">
            Feminine nouns that start with a stressed <strong>a-</strong> take <Es className="font-bold">el / un</Es> in the singular, just to sound better:{" "}
            <Es className="font-bold">el agua fría</Es>, but <Es className="font-bold">las aguas</Es>.
          </p>
        </li>
        <li className={card}>
          <Emoji className="text-3xl">🔗</Emoji>
          <h4 className="mt-2 text-lg font-extrabold text-ink">
            <Es>al</Es> &amp; <Es>del</Es>
          </h4>
          <p className="mt-1 leading-relaxed text-ink">
            <Es className="font-bold">a + el = al</Es> → <Es>Voy al parque.</Es>
            <br />
            <Es className="font-bold">de + el = del</Es> → <Es>La casa del profesor.</Es> (With <Es>la, los, las</Es> there is no change.)
          </p>
        </li>
      </ul>
    </LessonSection>
  );
}

/* ------------------------------------------------------------- Ejercicios */

function Progress({ total }: { total: number }) {
  const pct = Math.min(100, (total / TOTAL_POINTS) * 100);
  return (
    <div className={card}>
      <p className="flex items-center justify-between gap-3 font-bold text-ink">
        <span>
          <Emoji>🎯 </Emoji>Your progress
        </span>
        <span>
          {total} / {TOTAL_POINTS} points
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="Your progress"
        aria-valuemin={0}
        aria-valuemax={TOTAL_POINTS}
        aria-valuenow={total}
        aria-valuetext={`${total} / ${TOTAL_POINTS} points`}
        className="mt-3 h-4 overflow-hidden rounded-full bg-ink/10"
      >
        <div className="h-full rounded-full bg-brand-fuchsia transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
      <p aria-live="polite" className="mt-2 font-bold text-brand-burgundy empty:hidden">
        {total >= TOTAL_POINTS ? FEEDBACK.progressDone : ""}
      </p>
    </div>
  );
}

function Exercise({ num, type, title, intro, children }: { num: number; type: string; title: ReactNode; intro: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-[1.75rem] bg-surface p-5 ring-1 ring-ink/10 sm:p-7">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-yellow font-display text-2xl text-ink">
          {num}
        </span>
        <div>
          <span className="block text-sm font-bold tracking-wide text-brand-purple uppercase">{type}</span>
          <h3 id={id} className={h3}>
            <span className="sr-only">{num}. </span>
            {title}
          </h3>
        </div>
      </div>
      <p className="mt-4 max-w-[48rem] text-lg leading-relaxed text-ink">{intro}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Feedback({ text, good }: { text: string; good?: boolean }) {
  return (
    <p aria-live="polite" className={`mt-4 min-h-6 font-bold ${good === true ? "text-success" : good === false ? "text-danger" : "text-ink"}`}>
      {text}
    </p>
  );
}

type Zone = "pool" | Gender;

function shuffle<T>(a: readonly T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
}

function SortExercise({ onScore }: { onScore: (n: number) => void }) {
  const [order, setOrder] = useState(() => SORT_WORDS.map((w) => w.word));
  const [place, setPlace] = useState<Record<string, Zone>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [fb, setFb] = useState<{ text: string; good?: boolean }>({ text: "" });

  const zoneOf = (w: string): Zone => place[w] ?? "pool";
  const genderOf = (w: string) => SORT_WORDS.find((s) => s.word === w)!.gender;
  const emojiOf = (w: string) => SORT_WORDS.find((s) => s.word === w)!.emoji;

  const move = (word: string, zone: Zone) => {
    setPlace((p) => ({ ...p, [word]: zone }));
    setMarks((m) => {
      const rest = { ...m };
      delete rest[word];
      return rest;
    });
    setSelected(null);
    setFb({ text: "" });
  };

  const check = () => {
    setSelected(null);
    let right = 0;
    let placed = 0;
    const next: Record<string, boolean> = {};
    for (const w of order) {
      const z = zoneOf(w);
      if (z === "pool") continue;
      placed++;
      next[w] = z === genderOf(w);
      if (next[w]) right++;
    }
    setMarks(next);
    onScore(right);
    const left = SORT_WORDS.length - placed;
    if (left > 0) setFb({ text: FEEDBACK.sortLeft(right, left), good: false });
    else if (right === SORT_WORDS.length) setFb({ text: FEEDBACK.sortPerfect, good: true });
    else setFb({ text: FEEDBACK.sortSome(right), good: false });
  };

  const show = () => {
    setSelected(null);
    setPlace(Object.fromEntries(SORT_WORDS.map((w) => [w.word, w.gender])));
    setMarks(Object.fromEntries(SORT_WORDS.map((w) => [w.word, true])));
    setFb({ text: FEEDBACK.shown });
  };

  const reset = () => {
    setOrder(shuffle(SORT_WORDS.map((w) => w.word)));
    setPlace({});
    setMarks({});
    setSelected(null);
    setFb({ text: "" });
    onScore(0);
  };

  const chip = (w: string) => {
    const mark = marks[w];
    return (
      <li key={w}>
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", w);
            e.dataTransfer.effectAllowed = "move";
          }}
          aria-pressed={selected === w}
          onClick={() => setSelected((s) => (s === w ? null : w))}
          className={`inline-flex min-h-11 cursor-grab items-center gap-2 rounded-full px-4 py-1.5 font-bold ring-2 transition-[background-color,transform] duration-150 hover:-translate-y-0.5 active:cursor-grabbing motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
            selected === w
              ? "bg-brand-yellow text-ink ring-ink"
              : mark === true
                ? "bg-surface text-ink ring-success"
                : mark === false
                  ? "bg-surface text-ink ring-danger"
                  : "bg-cream text-ink ring-ink/15"
          }`}
        >
          <Emoji>{emojiOf(w)}</Emoji>
          <span lang="es">{w}</span>
          {mark !== undefined && (
            <>
              <span aria-hidden="true" className={mark ? "text-success" : "text-danger"}>
                {mark ? "✓" : "✗"}
              </span>
              <span className="sr-only">{mark ? "correct" : "incorrect"}</span>
            </>
          )}
        </button>
      </li>
    );
  };

  const dropProps = (zone: Zone) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const w = e.dataTransfer.getData("text/plain");
      if (SORT_WORDS.some((s) => s.word === w)) move(w, zone);
    },
  });

  const zoneBox = (zone: Gender) => {
    const label = zone === "m" ? "🟣 Masculine · el" : "🌸 Feminine · la";
    const words = order.filter((w) => zoneOf(w) === zone);
    return (
      <div {...dropProps(zone)} className={`flex min-h-40 flex-col rounded-[1.5rem] border-2 border-dashed p-3 ${zone === "m" ? "border-brand-purple bg-brand-purple/6" : "border-brand-fuchsia bg-brand-fuchsia/6"}`}>
        <button
          type="button"
          onClick={() => selected && move(selected, zone)}
          aria-disabled={!selected}
          className={`${btn} w-full justify-start ${zone === "m" ? "bg-brand-purple text-on-structure" : "bg-brand-fuchsia text-on-primary"} aria-disabled:cursor-default aria-disabled:hover:translate-y-0`}
        >
          <span aria-hidden="true">{label.slice(0, 2)}</span>
          <span>
            {zone === "m" ? "Masculine" : "Feminine"} · <Es>{zone === "m" ? "el" : "la"}</Es>
          </span>
          {selected && (
            <span className="ml-auto text-sm font-semibold">
              ← put “<Es>{selected}</Es>” here
            </span>
          )}
        </button>
        <ul className="mt-3 flex flex-wrap gap-2">{words.map(chip)}</ul>
      </div>
    );
  };

  const pool = order.filter((w) => zoneOf(w) === "pool");

  return (
    <Exercise
      num={1}
      type="Drag & drop"
      title="Masculine or feminine?"
      intro={
        <>
          Drag each noun into the <Es className="font-bold">el</Es> or <Es className="font-bold">la</Es> box. On a phone you can also tap a word, then tap a box. Careful
          — some are exceptions! <Emoji>😉</Emoji>
        </>
      }
    >
      <div {...dropProps("pool")} className="rounded-[1.5rem] bg-cream p-3">
        <p className="px-1 text-sm font-bold text-ink-muted">Words to sort</p>
        <ul className="mt-2 flex min-h-11 flex-wrap gap-2">{pool.map(chip)}</ul>
        {selected && zoneOf(selected) !== "pool" && (
          <button type="button" onClick={() => move(selected, "pool")} className={`${btnGhost} mt-3`}>
            ↩ Back to the word list
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {zoneBox("m")}
        {zoneBox("f")}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={check} className={btnSolid}>
          Check answers
        </button>
        <button type="button" onClick={show} className={btnGhost}>
          Show answers
        </button>
        <button type="button" onClick={reset} className={btnGhost}>
          <Emoji>↺</Emoji> Try again
        </button>
      </div>
      <Feedback {...fb} />
    </Exercise>
  );
}

function PluralExercise({ onScore }: { onScore: (n: number) => void }) {
  const baseId = useId();
  const empty = () => PLURALS.map(() => "");
  const [values, setValues] = useState<string[]>(empty);
  const [result, setResult] = useState<(ReturnType<typeof checkPlural> | null)[]>(() => PLURALS.map(() => null));
  const [fb, setFb] = useState<{ text: string; good?: boolean }>({ text: "" });

  const check = () => {
    const r = PLURALS.map((p, i) => checkPlural(values[i] ?? "", p.answer));
    setResult(r);
    const right = r.filter((x) => x === "right").length;
    onScore(right);
    setFb(right === PLURALS.length ? { text: FEEDBACK.pluralPerfect, good: true } : { text: FEEDBACK.pluralSome(right), good: false });
  };

  const fix = (i: number) => {
    const r = result[i];
    const answer = PLURALS[i]!.answer;
    if (!r || r === "right") return "";
    if (r === "empty") return FEEDBACK.pluralEmpty;
    if (r === "missingArticle") return FEEDBACK.pluralArticle(answer);
    return FEEDBACK.pluralFix(answer);
  };

  return (
    <Exercise
      num={2}
      type="Write it"
      title="Make it plural"
      intro={
        <>
          Write the plural form <strong>with its article</strong> (e.g. <Es>el gato</Es> → <Es className="font-bold">los gatos</Es>). Don’t worry about accents — we’ll
          accept them either way.
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {PLURALS.map((p, i) => {
            const r = result[i];
            const id = `${baseId}-${i}`;
            const msg = fix(i);
            return (
              <li key={p.singular} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="font-bold text-ink">
                  <Emoji>{`${p.emoji} `}</Emoji>
                  <Es>{p.singular}</Es> <span aria-hidden="true">→</span>
                  <span className="sr-only"> (plural)</span>
                </label>
                <input
                  id={id}
                  type="text"
                  lang="es"
                  autoComplete="off"
                  spellCheck={false}
                  value={values[i]}
                  aria-invalid={r ? r !== "right" : undefined}
                  aria-describedby={msg ? `${id}-fix` : undefined}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((vals) => vals.map((x, k) => (k === i ? v : x)));
                    setResult((rs) => rs.map((x, k) => (k === i ? null : x)));
                  }}
                  className={`block min-h-12 w-full rounded-[1rem] border-2 bg-surface px-4 py-2 text-lg text-ink ${
                    r === "right" ? "border-success" : r ? "border-danger" : "border-ink/35 hover:border-brand-purple"
                  }`}
                />
                {r === "right" && (
                  <span className="text-sm font-bold text-success">
                    ✓ <span className="sr-only">correct</span>
                  </span>
                )}
                {msg && (
                  <span id={`${id}-fix`} className="text-sm font-bold text-danger">
                    {msg}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" className={btnSolid}>
            Check answers
          </button>
          <button
            type="button"
            onClick={() => {
              setValues(PLURALS.map((p) => p.answer));
              setResult(PLURALS.map(() => "right"));
              setFb({ text: FEEDBACK.shown });
            }}
            className={btnGhost}
          >
            Show answers
          </button>
          <button
            type="button"
            onClick={() => {
              setValues(empty());
              setResult(PLURALS.map(() => null));
              setFb({ text: "" });
              onScore(0);
            }}
            className={btnGhost}
          >
            <Emoji>↺</Emoji> Try again
          </button>
        </div>
      </form>
      <Feedback {...fb} />
    </Exercise>
  );
}

function ChoiceExercise({ onScore }: { onScore: (n: number) => void }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => MCQ.map(() => null));
  const [round, setRound] = useState(0);
  const done = picked.filter((p) => p !== null).length;
  const right = picked.filter((p, i) => p === MCQ[i]!.answer).length;

  let fb: { text: string; good?: boolean } = { text: "" };
  if (done === MCQ.length) fb = right === MCQ.length ? { text: FEEDBACK.mcqPerfect, good: true } : { text: FEEDBACK.mcqSome(right), good: right >= 6 };
  else if (done > 0) fb = { text: FEEDBACK.mcqRunning(right, MCQ.length - done) };

  return (
    <Exercise num={3} type="Choose" title="Pick the right article" intro="Read the sentence and the English clue, then choose the article that matches the noun.">
      <ol key={round} className="grid gap-4 md:grid-cols-2">
        {MCQ.map((q, i) => {
          const p = picked[i];
          const answered = p !== null && p !== undefined;
          const [before, after] = q.sentence.split("___");
          const ok = answered && p === q.answer;
          return (
            <li key={q.sentence} className={`rounded-[1.25rem] bg-cream p-4 ring-2 ${answered ? (ok ? "ring-success" : "ring-danger") : "ring-transparent"}`}>
              <p className="text-lg font-semibold text-ink">
                {i + 1}.{" "}
                <span lang="es">
                  {before}
                  <span className="inline-block min-w-14 border-b-2 border-brand-fuchsia text-center font-extrabold text-brand-burgundy">
                    {answered ? q.options[q.answer] : <span aria-label="blank">___</span>}
                  </span>
                  {after}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">{q.hint}</p>
              <div role="group" aria-label={`Options for sentence ${i + 1}`} className="mt-3 flex flex-wrap gap-2">
                {q.options.map((o, k) => {
                  const isAnswer = answered && k === q.answer;
                  const isWrongPick = answered && k === p && k !== q.answer;
                  return (
                    <button
                      key={o}
                      type="button"
                      lang="es"
                      disabled={answered}
                      onClick={() => {
                        const next = picked.map((x, j) => (j === i ? k : x));
                        setPicked(next);
                        onScore(next.filter((x, j) => x === MCQ[j]!.answer).length);
                      }}
                      className={`${btn} min-w-16 ring-2 disabled:cursor-default disabled:hover:translate-y-0 ${
                        isAnswer ? "bg-success text-surface ring-success" : isWrongPick ? "bg-danger text-surface ring-danger" : "bg-surface text-ink ring-ink/20 hover:bg-brand-yellow/40"
                      }`}
                    >
                      {o}
                      {isAnswer && <span className="sr-only"> (correct answer)</span>}
                      {isWrongPick && <span className="sr-only"> (your answer, incorrect)</span>}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className="mt-3 text-sm text-ink" aria-live="polite">
                  {ok ? "✅ " : "❌ "}
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-5">
        <button
          type="button"
          onClick={() => {
            setPicked(MCQ.map(() => null));
            setRound((r) => r + 1);
            onScore(0);
          }}
          className={btnGhost}
        >
          <Emoji>↺</Emoji> Try again
        </button>
      </div>
      <Feedback {...fb} />
    </Exercise>
  );
}

function BagExercise({ onScore }: { onScore: (n: number) => void }) {
  const baseId = useId();
  const [values, setValues] = useState(() => BAG_PLACEHOLDERS.map(() => ""));
  const [checks, setChecks] = useState<(ReturnType<typeof checkBagItem> | null)[]>(() => BAG_PLACEHOLDERS.map(() => null));
  const [fb, setFb] = useState<{ text: string; good?: boolean }>({ text: "" });
  const [model, setModel] = useState(false);
  const modelId = useId();

  const message = (c: ReturnType<typeof checkBagItem> | null) => {
    if (!c) return "";
    if (c.ok) return FEEDBACK.bagOk;
    if (c.reason === "pluralNoun") return FEEDBACK.bagPlural(c.article);
    return c.reason === "empty" ? FEEDBACK.bagEmpty : FEEDBACK.bagStructure;
  };

  return (
    <Exercise
      num={4}
      type="Your turn"
      title={
        <>
          What’s in your bag? <Emoji>👜</Emoji>
        </>
      }
      intro={
        <>
          Write <strong>4 things</strong> you have in your bag right now, using <Es className="font-bold">un, una, unos</Es> or <Es className="font-bold">unas</Es>. Use a
          dictionary if you need it!
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const c = values.map((v) => checkBagItem(v));
          setChecks(c);
          const good = c.filter((x) => x.ok).length;
          onScore(good);
          setFb(good === 4 ? { text: FEEDBACK.bagAll, good: true } : { text: FEEDBACK.bagSome(good), good: false });
        }}
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BAG_PLACEHOLDERS.map((ph, i) => {
            const id = `${baseId}-${i}`;
            const c = checks[i] ?? null;
            const msg = message(c);
            return (
              <li key={i} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-sm font-bold text-ink">
                  Item {i + 1}
                </label>
                <input
                  id={id}
                  type="text"
                  lang="es"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={ph}
                  value={values[i]}
                  aria-invalid={c ? !c.ok : undefined}
                  aria-describedby={msg ? `${id}-msg` : undefined}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((vals) => vals.map((x, k) => (k === i ? v : x)));
                    setChecks((cs) => cs.map((x, k) => (k === i ? null : x)));
                  }}
                  className={`block min-h-12 w-full rounded-[1rem] border-2 bg-surface px-4 py-2 text-lg text-ink placeholder:text-ink-muted ${
                    c ? (c.ok ? "border-success" : "border-danger") : "border-ink/35 hover:border-brand-purple"
                  }`}
                />
                {msg && (
                  <span id={`${id}-msg`} className={`text-sm font-bold ${c?.ok ? "text-success" : "text-danger"}`}>
                    {msg}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" className={btnSolid}>
            Check
          </button>
          <button type="button" aria-expanded={model} aria-controls={modelId} onClick={() => setModel((m) => !m)} className={btnGhost}>
            <Emoji>👀</Emoji> See a model answer
          </button>
        </div>
      </form>
      <Feedback {...fb} />
      <div id={modelId} hidden={!model} className="mt-4 rounded-[1.25rem] bg-cream p-5">
        <p className="font-extrabold text-ink">
          Model answer · <Es>En mi bolso tengo…</Es>
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {BAG_MODEL.map((m) => (
            <Fragment key={m.word}>
              <li>
                <Word text={m.word} emoji={m.emoji} />
              </li>
            </Fragment>
          ))}
        </ul>
      </div>
    </Exercise>
  );
}
