import { Bubble } from "./Bubble";
import { MaribelPhoto } from "./MaribelPhoto";
import type { TeacherView } from "@/lib/teachers-source";

/**
 * Foto de una docente con el marco de la marca. Si aún no tiene foto, el
 * mismo marco con su inicial (decorativa: el nombre ya está en la página).
 */
export function TeacherPhoto({
  teacher,
  className = "",
  sizes,
  priority = false,
}: {
  teacher: Pick<TeacherView, "name" | "photo" | "photoPosition" | "photoAlt">;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (teacher.photo) {
    return (
      <MaribelPhoto
        alt={teacher.photoAlt}
        src={teacher.photo}
        position={teacher.photoPosition}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }
  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 translate-x-3 translate-y-3 rotate-[5deg] rounded-[2.25rem] bg-brand-fuchsia"
      />
      <Bubble
        tone="yellow"
        tail="none"
        shadow
        className="relative z-10"
        boxClassName="relative flex aspect-[4/5] items-center justify-center overflow-hidden !rounded-[2.25rem] bg-brand-yellow"
      >
        <span aria-hidden="true" className="lettering font-display text-[6rem] leading-none text-brand-fuchsia">
          {teacher.name.trim().charAt(0).toLocaleUpperCase()}
        </span>
      </Bubble>
    </div>
  );
}
