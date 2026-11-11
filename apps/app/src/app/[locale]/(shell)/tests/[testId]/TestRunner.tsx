"use client";

import { Check, Clock, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/form-styles";
import type { AnswerValue, AttemptPayload, AttemptResult, RunQuestion } from "@/lib/schemas/test-run";
import { startTestAction, submitTestAction } from "../actions";

type Props = {
  testId: string;
  locale: "es" | "en";
  title: string;
  canStart: boolean;
  backHref: string;
};

const btn =
  "inline-flex min-h-11 items-center gap-2 rounded-md px-5 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:opacity-60";
const primary = `${btn} bg-primary text-on-primary hover:bg-primary-hover`;
const ghost = `${btn} border border-line text-text hover:bg-surface-sunken`;

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Hacer un test: empieza el intento en el servidor, cuenta el tiempo y envía las respuestas para corregir. */
export function TestRunner({ testId, locale, title, canStart, backHref }: Props) {
  const t = useTranslations("tests.run");
  const te = useTranslations("errors.domain");
  const [payload, setPayload] = useState<AttemptPayload | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [served, setServed] = useState<RunQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const submitted = useRef(false);

  const start = async () => {
    setBusy(true);
    setError(null);
    const res = await startTestAction(testId);
    setBusy(false);
    if (!res.ok) {
      setError(te(res.error));
      return;
    }
    submitted.current = false;
    setAnswers({});
    setResult(null);
    setServed(res.data.questions);
    setLeft(res.data.expires_at ? new Date(res.data.expires_at).getTime() - Date.now() : null);
    setPayload(res.data);
  };

  const submit = useCallback(async () => {
    if (!payload || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    const res = await submitTestAction(payload.attempt_id, answers);
    setBusy(false);
    if (!res.ok) {
      submitted.current = false;
      setError(te(res.error));
      return;
    }
    setResult(res.data);
    setPayload(null);
  }, [payload, answers, te]);

  // Cuenta atrás: al llegar a cero se envía lo que haya.
  useEffect(() => {
    if (!payload?.expires_at) return;
    const end = new Date(payload.expires_at).getTime();
    const id = setInterval(() => {
      const remaining = end - Date.now();
      setLeft(remaining);
      if (remaining <= 0) void submit();
    }, 1000);
    return () => clearInterval(id);
  }, [payload, submit]);

  const set = (id: string, value: AnswerValue) => setAnswers((a) => ({ ...a, [id]: value }));
  const prompt = (q: RunQuestion) => (locale === "es" ? q.prompt_es : q.prompt_en);

  // ------------------------------------------------------------- Resultado
  if (result) {
    return (
      <section aria-labelledby="run-result" className="space-y-6">
        <div className={`rounded-lg border-2 p-6 ${result.passed ? "border-success" : "border-danger"}`}>
          <h2 id="run-result" className="text-2xl font-bold text-text">
            {result.passed ? t("passed") : t("failed")}
          </h2>
          <p className="mt-2 text-4xl font-extrabold text-structure">
            {result.grade.toFixed(1)} <span className="text-lg font-semibold text-text-muted">/ {result.grade_scale}</span>
          </p>
          <p className="mt-1 text-text-muted">
            {t("scoreLine", { score: result.score, max: result.max_score, percent: result.percent })}
          </p>
          {result.late ? <p className="mt-2 text-sm font-semibold text-danger">{t("late")}</p> : null}
        </div>
        <ReviewList result={result} questionsRef={served} locale={locale} />
        <div className="flex flex-wrap gap-3">
          {canStart ? (
            <button type="button" onClick={start} disabled={busy} className={primary}>
              <RotateCcw aria-hidden="true" className="size-4" /> {t("tryAgain")}
            </button>
          ) : null}
          <a href={backHref} className={ghost}>
            {t("back")}
          </a>
        </div>
        {error ? <p role="alert" className="font-semibold text-danger">{error}</p> : null}
      </section>
    );
  }

  // ------------------------------------------------------------- Haciendo el test
  if (payload) {
    const answered = payload.questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-6"
      >
        <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
          <p role="status" className="font-semibold text-text">
            {t("progress", { done: answered, total: payload.questions.length })}
          </p>
          {left !== null ? (
            <p className={`inline-flex items-center gap-2 font-mono font-bold ${left < 60_000 ? "text-danger" : "text-text"}`}>
              <Clock aria-hidden="true" className="size-4" /> <span className="sr-only">{t("timeLeft")}: </span>
              {formatClock(left)}
            </p>
          ) : null}
        </div>
        <ol className="space-y-5">
          {payload.questions.map((q, index) => (
            <li key={q.id}>
              <fieldset className="rounded-lg border border-line bg-surface p-5">
                <legend className="px-2 text-base font-bold text-text">
                  {index + 1}. {prompt(q)}
                </legend>
                {q.kind === "single" ? (
                  <div className="mt-2 grid gap-2">
                    {(q.options ?? []).map((o) => (
                      <label key={o.i} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-surface-sunken">
                        <input type="radio" name={q.id} checked={answers[q.id] === o.i} onChange={() => set(q.id, o.i)} className="size-5" />
                        {o.text}
                      </label>
                    ))}
                  </div>
                ) : null}
                {q.kind === "truefalse" ? (
                  <div className="mt-2 flex flex-wrap gap-4">
                    {([true, false] as const).map((v) => (
                      <label key={String(v)} className="flex min-h-11 cursor-pointer items-center gap-3 px-2">
                        <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => set(q.id, v)} className="size-5" />
                        {v ? t("true") : t("false")}
                      </label>
                    ))}
                  </div>
                ) : null}
                {q.kind === "fill" ? (
                  <div className="mt-2">
                    <label className="sr-only" htmlFor={`fill-${q.id}`}>
                      {t("yourAnswer")}
                    </label>
                    <input
                      id={`fill-${q.id}`}
                      type="text"
                      maxLength={200}
                      autoComplete="off"
                      value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                      onChange={(e) => set(q.id, e.target.value)}
                      placeholder={t("yourAnswer")}
                      className={`${inputClass} max-w-md`}
                    />
                  </div>
                ) : null}
              </fieldset>
            </li>
          ))}
        </ol>
        {error ? <p role="alert" className="font-semibold text-danger">{error}</p> : null}
        <button type="submit" disabled={busy} className={primary}>
          <Check aria-hidden="true" className="size-4" /> {busy ? t("sending") : t("submit")}
        </button>
      </form>
    );
  }

  // ------------------------------------------------------------- Antes de empezar
  return (
    <div>
      {canStart ? (
        <button type="button" onClick={start} disabled={busy} className={primary}>
          {busy ? t("starting") : t("start")}
        </button>
      ) : (
        <p className="font-semibold text-text-muted">{t("noMoreAttempts")}</p>
      )}
      {error ? <p role="alert" className="mt-3 font-semibold text-danger">{error}</p> : null}
      <span className="sr-only">{title}</span>
    </div>
  );
}

function ReviewList({ result, questionsRef, locale }: { result: AttemptResult; questionsRef: RunQuestion[]; locale: "es" | "en" }) {
  const t = useTranslations("tests.run");
  const byId = new Map(questionsRef.map((q) => [q.id, q]));
  const show = (q: RunQuestion, value: number | boolean | string | null): string => {
    if (value === null || value === "") return t("noAnswer");
    if (q.kind === "single") return q.options?.find((o) => o.i === value)?.text ?? t("noAnswer");
    if (q.kind === "truefalse") return value === true ? t("true") : t("false");
    return String(value);
  };
  return (
    <section aria-labelledby="run-review">
      <h3 id="run-review" className="mb-3 text-lg font-bold text-text">
        {t("review")}
      </h3>
      <ol className="space-y-3">
        {result.review.map((r, index) => {
          const q = byId.get(r.question_id);
          if (!q) return null;
          const explanation = locale === "es" ? r.explanation_es : r.explanation_en;
          return (
            <li key={r.question_id} className={`rounded-lg border p-4 ${r.correct ? "border-success" : "border-danger"}`}>
              <p className="flex items-start gap-2 font-semibold text-text">
                {r.correct ? <Check aria-label={t("correct")} className="mt-0.5 size-5 shrink-0 text-success" /> : <X aria-label={t("incorrect")} className="mt-0.5 size-5 shrink-0 text-danger" />}
                <span>
                  {index + 1}. {locale === "es" ? q.prompt_es : q.prompt_en}
                </span>
              </p>
              <p className="mt-1 text-sm text-text">
                {t("yourAnswerWas")}: <span className="font-semibold">{show(q, r.given)}</span>
              </p>
              {!r.correct ? (
                <p className="text-sm text-text">
                  {t("correctAnswer")}: <span className="font-semibold">{show(q, r.answer)}</span>
                </p>
              ) : null}
              {explanation ? <p className="mt-1 text-sm text-text-muted">{explanation}</p> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
