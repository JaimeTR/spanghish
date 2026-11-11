"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { parseGameItems, type FillItem, type GameType, type MatchItem, type OrderItem, type TrueFalseItem } from "@spanglish/content";

/** Barajado determinista (misma disposición en servidor y cliente, sin errores de hidratación). */
function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const chip =
  "min-h-11 rounded-md border px-3 py-2 text-left font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple";
const neutral = `${chip} border-line bg-surface text-text hover:bg-surface-sunken`;
const selected = `${chip} border-structure bg-structure text-on-structure`;
const good = `${chip} border-success bg-success/12 text-text`;
const bad = `${chip} border-danger bg-danger/10 text-text`;
const actionBtn =
  "inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:opacity-60";
const ghostBtn =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 font-semibold text-text hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple";

function Frame({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h3 className="text-lg font-bold text-text">{title}</h3>
      <p className="mt-1 mb-4 text-sm text-text-muted">{hint}</p>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- Parejas
function Match({ items, seed }: { items: MatchItem[]; seed: string }) {
  const t = useTranslations("content.games");
  const right = useMemo(() => seededShuffle(items.map((_, i) => i), seed), [items, seed]);
  const [pick, setPick] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const finished = done.size === items.length;

  const choose = (rightIndex: number) => {
    if (pick === null || done.has(rightIndex)) return;
    setTries((n) => n + 1);
    if (pick === rightIndex) {
      setDone(new Set(done).add(rightIndex));
      setWrong(null);
    } else {
      setWrong(rightIndex);
    }
    setPick(null);
  };
  const reset = () => {
    setDone(new Set());
    setPick(null);
    setWrong(null);
    setTries(0);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <ul className="grid gap-2">
          {items.map((item, i) => (
            <li key={i}>
              <button
                type="button"
                aria-pressed={pick === i}
                disabled={done.has(i)}
                onClick={() => {
                  setPick(i);
                  setWrong(null);
                }}
                className={`${done.has(i) ? good : pick === i ? selected : neutral} w-full`}
              >
                {item.a}
              </button>
            </li>
          ))}
        </ul>
        <ul className="grid gap-2">
          {right.map((i) => (
            <li key={i}>
              <button
                type="button"
                disabled={done.has(i) || pick === null}
                onClick={() => choose(i)}
                className={`${done.has(i) ? good : wrong === i ? bad : neutral} w-full`}
              >
                {items[i]!.b}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p role="status" className="mt-4 font-semibold text-text">
        {finished ? t("matchDone", { tries }) : t("matchProgress", { done: done.size, total: items.length })}
      </p>
      {finished ? (
        <button type="button" onClick={reset} className={`${ghostBtn} mt-2`}>
          <RotateCcw aria-hidden="true" className="size-4" /> {t("again")}
        </button>
      ) : null}
    </div>
  );
}

// -------------------------------------------------------------- Completar
function Fill({ items, seed }: { items: FillItem[]; seed: string }) {
  const t = useTranslations("content.games");
  const [answers, setAnswers] = useState<(string | null)[]>(() => items.map(() => null));
  const [checked, setChecked] = useState(false);
  const score = answers.filter((a, i) => a === items[i]!.answer).length;
  const reset = () => {
    setAnswers(items.map(() => null));
    setChecked(false);
  };

  return (
    <div>
      <ol className="space-y-5">
        {items.map((item, i) => {
          const [before, ...after] = item.text.split("___");
          const options = seededShuffle(item.options, `${seed}-${i}`);
          return (
            <li key={i}>
              <p className="text-lg text-text">
                {before}
                <span className="mx-1 inline-block min-w-16 border-b-2 border-structure text-center font-bold text-structure">
                  {answers[i] ?? " "}
                </span>
                {after.join("___")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("options")}>
                {options.map((option) => {
                  const state = !checked
                    ? answers[i] === option
                      ? selected
                      : neutral
                    : option === item.answer
                      ? good
                      : answers[i] === option
                        ? bad
                        : neutral;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={answers[i] === option}
                      disabled={checked}
                      onClick={() => setAnswers(answers.map((a, k) => (k === i ? option : a)))}
                      className={state}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {checked ? (
          <button type="button" onClick={reset} className={ghostBtn}>
            <RotateCcw aria-hidden="true" className="size-4" /> {t("again")}
          </button>
        ) : (
          <button type="button" disabled={answers.some((a) => a === null)} onClick={() => setChecked(true)} className={actionBtn}>
            <Check aria-hidden="true" className="size-4" /> {t("check")}
          </button>
        )}
        <p role="status" className="font-semibold text-text">
          {checked ? t("score", { score, total: items.length }) : ""}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Ordenar
function OrderOne({ item, seed }: { item: OrderItem; seed: string }) {
  const t = useTranslations("content.games");
  const words = useMemo(() => item.sentence.split(/\s+/), [item.sentence]);
  const bank = useMemo(() => seededShuffle(words.map((_, i) => i), seed), [words, seed]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const attempt = placed.map((i) => words[i]).join(" ");
  const correct = attempt === words.join(" ");

  return (
    <div className="rounded-md border border-line p-4">
      {item.translation ? <p className="mb-2 text-sm text-text-muted">{item.translation}</p> : null}
      <div
        aria-label={t("yourSentence")}
        className={`flex min-h-14 flex-wrap items-center gap-2 rounded-md border-2 border-dashed p-2 ${
          checked ? (correct ? "border-success" : "border-danger") : "border-line"
        }`}
      >
        {placed.map((i, k) => (
          <button
            key={`${i}-${k}`}
            type="button"
            disabled={checked && correct}
            onClick={() => {
              setPlaced(placed.filter((_, idx) => idx !== k));
              setChecked(false);
            }}
            className={selected}
          >
            {words[i]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {bank.map((i) => (
          <button
            key={i}
            type="button"
            disabled={placed.includes(i)}
            onClick={() => {
              setPlaced([...placed, i]);
              setChecked(false);
            }}
            className={`${neutral} disabled:opacity-30`}
          >
            {words[i]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={placed.length !== words.length} onClick={() => setChecked(true)} className={actionBtn}>
          <Check aria-hidden="true" className="size-4" /> {t("check")}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaced([]);
            setChecked(false);
          }}
          className={ghostBtn}
        >
          <RotateCcw aria-hidden="true" className="size-4" /> {t("clear")}
        </button>
        <p role="status" className="font-semibold text-text">
          {checked ? (correct ? t("right") : t("wrong")) : ""}
        </p>
      </div>
    </div>
  );
}

function Order({ items, seed }: { items: OrderItem[]; seed: string }) {
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <OrderOne key={i} item={item} seed={`${seed}-${i}`} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Tarjetas
function Flashcards({ items }: { items: MatchItem[] }) {
  const t = useTranslations("content.games");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = items[index]!;
  const go = (delta: number) => {
    setIndex((index + delta + items.length) % items.length);
    setFlipped(false);
  };
  return (
    <div>
      <button
        type="button"
        aria-pressed={flipped}
        onClick={() => setFlipped(!flipped)}
        className="flex min-h-40 w-full items-center justify-center rounded-lg border-2 border-structure bg-surface-sunken p-6 text-center text-2xl font-bold text-structure focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
      >
        <span className="sr-only">{flipped ? t("back") : t("front")}: </span>
        {flipped ? card.b : card.a}
      </button>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => go(-1)} className={ghostBtn}>
          {t("previous")}
        </button>
        <p role="status" className="text-sm font-semibold text-text-muted">
          {t("card", { current: index + 1, total: items.length })} · {t("flipHint")}
        </p>
        <button type="button" onClick={() => go(1)} className={ghostBtn}>
          {t("next")}
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------- Verdadero / falso
function TrueFalse({ items }: { items: TrueFalseItem[] }) {
  const t = useTranslations("content.games");
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => items.map(() => null));
  const answered = answers.filter((a) => a !== null).length;
  const score = answers.filter((a, i) => a === items[i]!.answer).length;
  return (
    <div>
      <ol className="space-y-4">
        {items.map((item, i) => {
          const given = answers[i];
          return (
            <li key={i} className="rounded-md border border-line p-4">
              <p className="text-text">{item.text}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([true, false] as const).map((value) => {
                  const state =
                    given === null ? neutral : value === item.answer ? good : given === value ? bad : neutral;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      disabled={given !== null}
                      onClick={() => setAnswers(answers.map((a, k) => (k === i ? value : a)))}
                      className={state}
                    >
                      {value ? <Check aria-hidden="true" className="mr-1 inline size-4" /> : <X aria-hidden="true" className="mr-1 inline size-4" />}
                      {value ? t("true") : t("false")}
                    </button>
                  );
                })}
              </div>
              {given !== null ? (
                <p role="status" className="mt-2 text-sm text-text">
                  {given === item.answer ? t("right") : t("wrong")} {item.explanation ?? ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p role="status" className="font-semibold text-text">
          {answered === items.length ? t("score", { score, total: items.length }) : ""}
        </p>
        {answered > 0 ? (
          <button type="button" onClick={() => setAnswers(items.map(() => null))} className={ghostBtn}>
            <RotateCcw aria-hidden="true" className="size-4" /> {t("again")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Un juego de lección: elige el componente por tipo y valida los datos antes de pintarlos. */
export function GameBlock({
  blockId,
  gameType,
  items,
  title,
}: {
  blockId: string;
  gameType: GameType;
  items: unknown[];
  title: string;
}) {
  const t = useTranslations("content.games");
  const data = parseGameItems(gameType, items);
  if (!data) return null;
  const body = (() => {
    switch (data.gameType) {
      case "match":
        return <Match items={data.items} seed={blockId} />;
      case "fill":
        return <Fill items={data.items} seed={blockId} />;
      case "order":
        return <Order items={data.items} seed={blockId} />;
      case "flashcards":
        return <Flashcards items={data.items} />;
      case "truefalse":
        return <TrueFalse items={data.items} />;
    }
  })();
  return (
    <Frame title={title || t(`types.${gameType}`)} hint={t(`hints.${gameType}`)}>
      {body}
    </Frame>
  );
}
