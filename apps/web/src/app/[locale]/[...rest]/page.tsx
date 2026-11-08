import { notFound } from "next/navigation";

/**
 * Cualquier ruta desconocida bajo un idioma (/es/nope) cae aquí y muestra la
 * 404 de marca ([locale]/not-found.tsx) con estado HTTP 404. Las URL sin
 * idioma (/zzz) las redirige antes el proxy a /es/zzz.
 */
export default function CatchAll() {
  notFound();
}
