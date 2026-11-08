import Image from "next/image";
import { Bubble } from "./Bubble";

/**
 * Foto de Maribel con el tratamiento de la marca: recorte en bocadillo con la
 * extrusión burdeos del logo y la imagen pasada a tres tonos (sombras en
 * morado oscuro, medios en fucsia, luces en amarillo). Así encaja con la web
 * aunque la luz de la foto original cambie. `natural` la deja a color.
 */
export function MaribelPhoto({
  alt,
  natural = false,
  tail = "right",
  className = "",
  sizes = "(min-width: 1024px) 28rem, 90vw",
  priority = false,
}: {
  alt: string;
  natural?: boolean;
  tail?: "left" | "right";
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Bubble
      tone="yellow"
      tail={tail}
      shadow
      className={className}
      boxClassName="relative aspect-[4/5] overflow-hidden !rounded-[2.25rem] bg-brand-yellow"
    >
      {!natural && (
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <filter id="maribel-duotone" colorInterpolationFilters="sRGB">
            {/* Luminancia con algo más de contraste, luego mapa de degradado. */}
            <feColorMatrix type="matrix" values="0.4 0.55 0.15 0 0.06  0.4 0.55 0.15 0 0.06  0.4 0.55 0.15 0 0.06  0 0 0 1 0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.165 0.349 0.843 0.988" />
              <feFuncG type="table" tableValues="0.059 0.184 0.098 0.831" />
              <feFuncB type="table" tableValues="0.271 0.522 0.314 0.016" />
            </feComponentTransfer>
          </filter>
        </svg>
      )}
      <Image
        src="/maribel.webp"
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover object-[50%_18%]"
        style={natural ? undefined : { filter: "url(#maribel-duotone)" }}
      />
    </Bubble>
  );
}
