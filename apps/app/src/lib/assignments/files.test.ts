import { describe, expect, it } from "vitest";
import { assignmentState, formatGrade } from "./files";

const now = new Date("2026-11-12T10:00:00Z");

describe("assignmentState", () => {
  it("sin entrega: pendiente, o vencida si pasó la fecha", () => {
    expect(assignmentState(null, "2026-11-13T00:00:00Z", now)).toBe("todo");
    expect(assignmentState(undefined, null, now)).toBe("todo");
    expect(assignmentState(null, "2026-11-11T00:00:00Z", now)).toBe("overdue");
  });

  it("con entrega: entregada, fuera de plazo o calificada", () => {
    expect(assignmentState({ status: "submitted", is_late: false }, null, now)).toBe("submitted");
    expect(assignmentState({ status: "submitted", is_late: true }, null, now)).toBe("late");
    expect(assignmentState({ status: "graded", is_late: true }, null, now)).toBe("graded");
  });
});

describe("formatGrade", () => {
  it("muestra la nota sobre el máximo con el formato del idioma", () => {
    expect(formatGrade(8.5, 10, "es")).toBe("8,5 / 10");
    expect(formatGrade(8.5, 10, "en")).toBe("8.5 / 10");
    expect(formatGrade(90, 100, "es")).toBe("90 / 100");
  });
});
