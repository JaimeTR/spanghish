import { describe, expect, it } from "vitest";
import { assignmentsAverage, attendanceSummary } from "./progress";

describe("attendanceSummary", () => {
  it("presentes y tardes asisten, las faltas no y las justificadas no cuentan", () => {
    const s = attendanceSummary([{ status: "present" }, { status: "late" }, { status: "absent" }, { status: "excused" }, { status: "present" }]);
    expect(s).toMatchObject({ present: 2, late: 1, absent: 1, excused: 1, percent: 75 });
  });

  it("sin clases que contar no hay porcentaje", () => {
    expect(attendanceSummary([]).percent).toBeNull();
    expect(attendanceSummary([{ status: "excused" }]).percent).toBeNull();
  });
});

describe("assignmentsAverage", () => {
  it("promedia en % de la nota máxima de cada tarea", () => {
    expect(assignmentsAverage([{ grade: 8, max: 10 }, { grade: 90, max: 100 }])).toBe(85);
    expect(assignmentsAverage([{ grade: 15, max: 20 }])).toBe(75);
  });

  it("ignora lo no calificado y devuelve null si no hay nada", () => {
    expect(assignmentsAverage([{ grade: null, max: 10 }])).toBeNull();
    expect(assignmentsAverage([])).toBeNull();
  });
});
