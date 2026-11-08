"use client";

import { useId, useState, type ReactNode } from "react";
import { Bubble, type BubbleTone } from "../Bubble";
import { container } from "../styles";
import { speak, useSpeech } from "./speak";

/**
 * Piezas comunes de las lecciones copiadas de la web anterior. El texto de las
 * lecciones está en inglés; lo que está en español va con lang="es".
 */

/** Sección de lección: el h2 en un bocadillo, como el resto de la web. */
export function LessonSection({
  id,
  title,
  tone = "purple",
  tail = "left",
  bg = "bg-cream",
  intro,
  children,
}: {
  id: string;
  title: ReactNode;
  tone?: BubbleTone;
  tail?: "left" | "right";
  bg?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${bg} scroll-mt-20 py-14 lg:py-20`}>
      <div className={container}>
        <Bubble tone={tone} tail={tail} shadow className="inline-block max-w-full" boxClassName="px-6 py-4 sm:px-8">
          <h2 id={`${id}-title`} className="font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-tight">
            {title}
          </h2>
        </Bubble>
        {intro && <div className="mt-6 max-w-[44rem] text-lg leading-relaxed text-ink">{intro}</div>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/** Español dentro del texto en inglés. */
export function Es({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span lang="es" className={className}>
      {children}
    </span>
  );
}

/** Emoji decorativo. */
export function Emoji({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span aria-hidden="true" className={className}>
      {children}
    </span>
  );
}

const wordBase =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-cream px-4 py-1.5 text-left font-semibold text-ink ring-2 ring-ink/15";

/**
 * Palabra en español que se oye al pulsarla (si el navegador tiene voz; si no,
 * es texto). `say` es lo que se lee; por defecto, el texto.
 */
export function Word({ text, say, emoji, className = "", children }: { text: string; say?: string; emoji?: string; className?: string; children?: ReactNode }) {
  const speech = useSpeech();
  const content = (
    <>
      {emoji && <Emoji>{emoji}</Emoji>}
      <span lang="es">{children ?? text}</span>
    </>
  );
  if (!speech) return <span className={`${wordBase} ${className}`}>{content}</span>;
  return (
    <button
      type="button"
      onClick={() => speak(say ?? text)}
      aria-label={`Listen: ${say ?? text}`}
      className={`${wordBase} cursor-pointer transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-brand-yellow/40 active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      {content}
      <Emoji className="text-sm opacity-70">🔊</Emoji>
    </button>
  );
}

/** Botón 🔊 suelto; no se pinta si el navegador no tiene voz. */
export function Speaker({ say, label, className = "" }: { say: string; label?: string; className?: string }) {
  const speech = useSpeech();
  if (!speech) return null;
  return (
    <button
      type="button"
      onClick={() => speak(say)}
      aria-label={`Listen: ${label ?? say}`}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-lg ring-2 ring-ink/15 transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-brand-yellow active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      <Emoji>🔊</Emoji>
    </button>
  );
}

/** "🇪🇸 Ver resumen en español": desplegable con el resumen publicado. */
export function SpanishSummary({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-purple px-5 py-2 font-bold text-on-structure transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <Emoji>🇪🇸</Emoji>
        <span lang="es">{open ? "Ocultar resumen en español" : "Ver resumen en español"}</span>
      </button>
      <div id={id} hidden={!open} lang="es" className="mt-4 rounded-[1.25rem] bg-surface p-5 ring-1 ring-ink/10">
        <p className="font-extrabold text-brand-purple">{title}</p>
        <p className="mt-2 leading-relaxed text-ink">{text}</p>
      </div>
    </div>
  );
}

/** Lista de consejos con el término en negrita. */
export function Tips({ title, tips }: { title: string; tips: readonly { term: string; text: ReactNode }[] }) {
  return (
    <div className="rounded-[1.75rem] bg-surface p-6 ring-1 ring-ink/10 sm:p-8">
      <h3 className="font-display text-[1.75rem] leading-tight text-ink">
        <Emoji>💡 </Emoji>
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-3">
        {tips.map((tip) => (
          <li key={tip.term} className="flex gap-3 leading-relaxed text-ink">
            <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-brand-fuchsia" />
            <span>
              <strong className="font-extrabold">{tip.term}</strong> {tip.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
