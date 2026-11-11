import { UserRound } from "lucide-react";
import Image from "next/image";
import { mediaUrl } from "./content/Cover";

/**
 * Foto de perfil redonda. Sin foto, la inicial del nombre (o un icono si no hay
 * nombre). Es decorativa: el nombre ya está al lado.
 */
export function Avatar({
  path,
  name,
  size = 36,
  className = "",
}: {
  path?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size };
  if (path) {
    return (
      <Image
        src={mediaUrl(path)}
        alt=""
        width={size}
        height={size}
        unoptimized
        style={box}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  const initial = name?.trim().charAt(0).toLocaleUpperCase() ?? "";
  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: Math.round(size * 0.4) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-highlight font-bold text-on-highlight ${className}`}
    >
      {initial || <UserRound className="size-1/2" strokeWidth={2} />}
    </span>
  );
}
