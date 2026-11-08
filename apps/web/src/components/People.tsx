/** Círculos por persona: 1, 2 o un grupo. Geometría, no ilustración. */
export function People({ count }: { count: number }) {
  const colors = ["#D71950", "#592F85", "#FCD404", "#8F0831", "#D71950"];
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${count * 26 + 10} 40`} width={count * 26 + 10} height={40} className="block">
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(${i * 26} 0)`}>
          <circle cx="18" cy="12" r="8" fill={colors[i]} />
          <path d="M4 40c0-9 6-15 14-15s14 6 14 15z" fill={colors[i]} />
        </g>
      ))}
    </svg>
  );
}

/** Cuántas figuras dibujar para cada formato. */
export const PEOPLE_BY_FORMAT = { private: 1, own: 2, local: 5 } as const;
