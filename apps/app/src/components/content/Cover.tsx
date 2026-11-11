import { BookOpen } from "lucide-react";
import Image from "next/image";

export function mediaUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/content-media/${path}` : path;
}

/**
 * Portada pequeña de una lección o recurso (decorativa: el título ya está al
 * lado, así que no repite el texto alternativo). Sin imagen, un marcador.
 */
export function CoverThumb({ path, size = 56, className = "" }: { path: string | null | undefined; size?: number; className?: string }) {
  const box = { width: size, height: size };
  if (!path) {
    return (
      <span
        aria-hidden="true"
        style={box}
        className={`inline-flex shrink-0 items-center justify-center rounded-md bg-surface-sunken text-text-muted ${className}`}
      >
        <BookOpen className="size-1/2" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <Image
      src={mediaUrl(path)}
      alt=""
      width={size}
      height={size}
      unoptimized
      style={box}
      className={`shrink-0 rounded-md object-cover ${className}`}
    />
  );
}
