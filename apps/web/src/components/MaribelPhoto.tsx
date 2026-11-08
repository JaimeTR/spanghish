import Image from "next/image";
import { Bubble } from "./Bubble";

/**
 * Foto de Maribel al natural, enmarcada con el lenguaje de la marca: recorte en
 * bocadillo con la sombra burdeos del logo y, detrás, una placa fucsia girada.
 * Al pasar el cursor la placa se endereza, el marco se eleva y la foto se
 * acerca despacio (como en los videos). Sin movimiento no se anima nada.
 */
export function MaribelPhoto({
  alt,
  tail = "right",
  className = "",
  sizes = "(min-width: 1024px) 20rem, 70vw",
  priority = false,
}: {
  alt: string;
  tail?: "left" | "right";
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={`group relative ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 bottom-4 -z-0 translate-x-3 translate-y-3 rotate-[5deg] rounded-[2.25rem] bg-brand-fuchsia transition-transform duration-500 ease-out group-hover:translate-x-1.5 group-hover:translate-y-1.5 group-hover:rotate-[1deg] motion-reduce:transition-none"
      />
      <Bubble
        tone="yellow"
        tail={tail}
        shadow
        className="relative z-10 transition-transform duration-500 ease-out group-hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
        boxClassName="relative aspect-[4/5] overflow-hidden !rounded-[2.25rem] bg-brand-yellow"
      >
        <Image
          src="/maribel.webp"
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover object-[50%_18%] transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </Bubble>
    </div>
  );
}
