// Iconos de trazo propios (2.4px, extremos redondeados). Siempre decorativos:
// el texto del enlace o del botón lleva el significado.

import type { ReactNode } from "react";

export function ArrowIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

export function ExternalIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h9v9M16 4L5 15" />
    </svg>
  );
}

export function SparkIcon({ className = "mt-0.5 size-5 shrink-0" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="currentColor">
      <path d="M10 1.5l2 6.1 6.5.4-5.1 4 1.8 6.5L10 14.8l-5.2 3.7 1.8-6.5L1.5 8l6.5-.4L10 1.5z" />
    </svg>
  );
}

export function ClockIcon({ className = "mt-1 size-5 shrink-0" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 5.5V10l3 2" />
    </svg>
  );
}

export function PinIcon({ className = "mt-1 size-5 shrink-0" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="10" cy="8" r="2.2" />
    </svg>
  );
}

export function PhoneIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 2.5h-2a1 1 0 0 0-1 1.1C3 11 9 17 16.4 17.5a1 1 0 0 0 1.1-1v-2l-3.6-1.5-1.8 1.8a10.5 10.5 0 0 1-5.4-5.4l1.8-1.8L7 4z" />
    </svg>
  );
}

export function CheckIcon({ className = "mt-1 size-5 shrink-0 text-brand-yellow" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

/** Persona: acceso al portal de alumnos. */
export function UserIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="6.5" r="3.5" />
      <path d="M3.5 17.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export function LockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="12" height="9" rx="2.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

/** Icono de cada tipo de recurso (hojas, palabras, lecciones, grabación, tareas). */
export function ResourceIcon({ kind, className = "size-7" }: { kind: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    lessons: <path d="M3 5.5C5.5 4 8 4 10 5.5 12 4 14.5 4 17 5.5v10C14.5 14 12 14 10 15.5 8 14 5.5 14 3 15.5zM10 5.5v10" />,
    worksheets: <path d="M5 2.5h7l3.5 3.5v11.5H5zM12 2.5V6h3.5M8 10h5M8 13h5" />,
    vocabulary: <path d="M3.5 4.5h13a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H3.5A1.5 1.5 0 0 1 2 12V6a1.5 1.5 0 0 1 1.5-1.5zM6 8h8M6 10.5h5" />,
    recordings: <path d="M2.5 5.5h10a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 1 13V7a1.5 1.5 0 0 1 1.5-1.5zM14 9l5-3v8l-5-3" />,
    coursework: <path d="M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v11.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5zM8 2.5h4v2H8zM7.5 10l1.8 1.8L13 8.2M7.5 14.5h5" />,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {paths[kind] ?? paths.lessons}
    </svg>
  );
}
