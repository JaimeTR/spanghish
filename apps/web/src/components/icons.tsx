// Iconos de trazo propios (2.4px, extremos redondeados). Siempre decorativos:
// el texto del enlace o del botón lleva el significado.

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
