import { Bubble, SectionQuestion, type BubbleTone } from "./Bubble";
import { container } from "./styles";

/**
 * Preguntas frecuentes como conversación: la pregunta del visitante en un
 * bocadillo blanco y la respuesta debajo, como texto corrido. Todo visible
 * (son pocas y cortas: no hace falta acordeón). En /faq se repite un bloque
 * por tema: `id` distingue cada uno y `className` alterna el color del campo.
 */
export function Faq({
  title,
  items,
  id = "faq",
  tone = "purple",
  className = "bg-cream",
}: {
  title: string;
  items: { key: string; q: string; a: string }[];
  id?: string;
  tone?: BubbleTone;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`py-20 lg:py-28 ${className}`}>
      <div className={`${container} grid gap-12 lg:grid-cols-12`}>
        <div className="lg:col-span-4">
          <SectionQuestion id={`${id}-title`} tone={tone} tail="left" className="lg:sticky lg:top-28">
            {title}
          </SectionQuestion>
        </div>
        <ul className="flex flex-col gap-10 lg:col-span-8">
          {items.map((item) => (
            <li key={item.key} className="max-w-[44rem]">
              <Bubble tone="white" tail="left" className="inline-block max-w-full" boxClassName="px-5 py-3 sm:px-6">
                <h3 className="font-display text-[clamp(1.35rem,3vw,1.6rem)] leading-tight text-brand-burgundy">{item.q}</h3>
              </Bubble>
              <p className="mt-3 text-lg leading-relaxed text-ink sm:pl-6">{item.a}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
