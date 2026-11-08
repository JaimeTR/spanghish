import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "./icons";

/**
 * Bloque de color de un público (adultos, niños, mayores). Toda la superficie
 * es clicable (enlace estirado desde el h3) y el anillo de foco rodea el bloque.
 *
 * Sin `image`: la edad, en rotulado grande, es el dato que el visitante busca.
 * Con `image`: la foto va arriba, la edad asoma como una pestaña del color del
 * bloque que sube sobre la foto, y el texto queda en el panel de color.
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
  image,
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
  image?: { src: string; sizes: string; position?: string };
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const focus =
    "has-[a:focus-visible]:outline-[3px] has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-[var(--brand-purple)] has-[a:focus-visible]:outline-solid";

  const heading = (
    <Heading className={`font-display leading-none ${big ? "text-[clamp(2.1rem,4.5vw,3.25rem)]" : "text-[2rem]"}`}>
      <Link href={href} className="text-current no-underline outline-none after:absolute after:inset-0 after:content-['']">
        {title}
        {!ageHidden && <span className="sr-only"> ({age})</span>}
      </Link>
    </Heading>
  );

  if (image) {
    return (
      <li
        className={`group relative flex flex-col overflow-hidden rounded-lg transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focus} ${className}`}
      >
        <div className={`relative aspect-[3/2] overflow-hidden bg-inherit ${big ? "lg:aspect-auto lg:min-h-[19rem] lg:flex-1" : ""}`}>
          <Image
            src={image.src}
            alt=""
            fill
            sizes={image.sizes}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            style={{ objectPosition: image.position }}
          />
          {!ageHidden && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-5 rounded-t-3xl bg-inherit px-5 pt-3 font-display text-[2.25rem] leading-none sm:left-7"
            >
              {age}
            </span>
          )}
          <span
            aria-hidden="true"
            className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-inherit shadow-md transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <ArrowIcon />
          </span>
        </div>
        <div className="p-6 pt-5 sm:p-8 sm:pt-6">
          {heading}
          <p className={`mt-3 leading-relaxed ${big ? "max-w-[34rem] text-lg sm:text-xl" : "text-base"}`}>{body}</p>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`group relative flex flex-col justify-between gap-8 overflow-hidden rounded-lg p-6 transition-transform duration-200 ease-out hover:-translate-y-1 ${focus} motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8 ${className}`}
    >
      <p aria-hidden="true" className={`font-display leading-[0.85] ${big ? "text-[clamp(5rem,15vw,10rem)]" : "text-[clamp(4rem,9vw,5.5rem)]"}`}>
        {age}
      </p>
      <div>
        {heading}
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
