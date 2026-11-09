export type MockKind = "table" | "calendar" | "cards" | "chart";

const bar = "rounded-sm bg-line";

/**
 * Esqueleto visual estático de cómo se verá un módulo. Decorativo: no lleva
 * texto ni datos (aria-hidden); la etiqueta "Vista de ejemplo" la pone quien lo usa.
 */
export function MockPreview({ kind }: { kind: MockKind }) {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-md border border-line bg-surface p-4">
      {kind === "table" && <MockTable />}
      {kind === "calendar" && <MockCalendar />}
      {kind === "cards" && <MockCards />}
      {kind === "chart" && <MockChart />}
    </div>
  );
}

function MockTable() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 border-b border-line pb-3">
        {[40, 24, 20, 16].map((w, i) => (
          <div key={i} className={`h-3 ${bar} bg-text-muted/30`} style={{ width: `${w}%` }} />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <div className={`h-3 ${bar}`} style={{ width: `${36 + ((row * 7) % 10)}%` }} />
          <div className={`h-3 ${bar}`} style={{ width: "22%" }} />
          <div className="h-5 w-[18%] rounded-full bg-highlight/50" />
          <div className={`h-3 ${bar}`} style={{ width: "12%" }} />
        </div>
      ))}
    </div>
  );
}

function MockCalendar() {
  const filled = new Set([1, 3, 8, 10, 12, 15, 17, 22, 24]);
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={`h${i}`} className={`h-2.5 ${bar} bg-text-muted/30`} />
      ))}
      {Array.from({ length: 28 }, (_, i) => (
        <div key={i} className="flex h-12 flex-col gap-1 rounded-sm border border-line p-1">
          {filled.has(i) && <div className="h-2.5 rounded-sm bg-structure/40" />}
          {filled.has(i) && i % 2 === 0 && <div className="h-2.5 rounded-sm bg-highlight/60" />}
        </div>
      ))}
    </div>
  );
}

function MockCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-line p-3">
          <div className="h-16 rounded-sm bg-structure/15" />
          <div className={`h-3 w-3/4 ${bar}`} />
          <div className={`h-3 w-1/2 ${bar}`} />
        </div>
      ))}
    </div>
  );
}

function MockChart() {
  return (
    <div className="flex h-36 items-end gap-3 border-b border-l border-line px-3 pb-0">
      {[35, 55, 45, 70, 60, 85, 75].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-sm bg-structure/40" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
