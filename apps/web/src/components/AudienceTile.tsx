import Link from "next/link";
import { ArrowIcon } from "./icons";

/**
 * Bloque de color de un público (adultos, niños, mayores). Toda la superficie
 * es clicable (enlace estirado desde el h3) y el anillo de foco rodea el bloque.
 * La edad, en rotulado grande, es el dato que el visitante busca.
 */
export function AudienceTile({
  className,
  age,
  title,
  body,
  href,
  big = false,
  ageHidden = false,
  headingLevel = 3,
}: {
  className: string;
  age: string;
  title: string;
  body: string;
  href: string;
  big?: boolean;
  /** La "edad" es decorativa (p. ej. "¡Hola!") y no se añade al nombre del enlace. */
  ageHidden?: boolean;
  /** h3 bajo un h2 de sección; h2 cuando los bloques cuelgan directamente del h1. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <li
      className={`group relative flex flex-col justify-between gap-8 overflow-hidden rounded-lg p-6 transition-transform duration-200 ease-out hover:-translate-y-1 has-[a:focus-visible]:outline-[3px] has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-[var(--brand-purple)] has-[a:focus-visible]:outline-solid motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8 ${className}`}
    >
      <p aria-hidden="true" className={`font-display leading-[0.85] ${big ? "text-[clamp(5rem,15vw,10rem)]" : "text-[clamp(4rem,9vw,5.5rem)]"}`}>
        {age}
      </p>
      <div>
        <Heading className={`font-display leading-none ${big ? "text-[clamp(2.1rem,4.5vw,3.25rem)]" : "text-[2rem]"}`}>
          <Link href={href} className="text-current no-underline outline-none after:absolute after:inset-0 after:content-['']">
            {title}
            {!ageHidden && <span className="sr-only"> ({age})</span>}
          </Link>
        </Heading>
        <p className={`mt-3 leading-relaxed ${big ? "max-w-[28rem] text-lg sm:text-xl" : "text-base"}`}>{body}</p>
      </div>
      <span
        aria-hidden="true"
        className="absolute top-6 right-6 flex size-12 items-center justify-center rounded-full ring-2 ring-current transition-colors duration-200 group-hover:bg-ink/10 sm:top-8 sm:right-8"
      >
        <ArrowIcon />
      </span>
    </li>
  );
}
