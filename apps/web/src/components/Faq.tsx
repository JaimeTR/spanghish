import { Bubble, SectionQuestion } from "./Bubble";
import { container } from "./styles";

/**
 * Preguntas frecuentes como conversación: la pregunta del visitante en un
 * bocadillo blanco y la respuesta debajo, como texto corrido. Todo visible
 * (son pocas y cortas: no hace falta acordeón).
 */
export function Faq({ title, items }: { title: string; items: { key: string; q: string; a: string }[] }) {
  return (
    <section aria-labelledby="faq-title" className="bg-cream py-20 lg:py-28">
      <div className={`${container} grid gap-12 lg:grid-cols-12`}>
        <div className="lg:col-span-4">
          <SectionQuestion id="faq-title" tone="purple" tail="left" className="lg:sticky lg:top-28">
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
