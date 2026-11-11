import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/admin/PageHeader";
import type { AssignmentState } from "@/lib/assignments/files";

const TONES = { todo: "warning", overdue: "muted", submitted: "info", late: "warning", graded: "success" } as const;

/** Insignia del estado de una tarea para el alumno (texto siempre visible, además del color). */
export function AssignmentStateBadge({ state }: { state: AssignmentState }) {
  const t = useTranslations("assignments.state");
  return <StatusBadge tone={TONES[state]}>{t(state)}</StatusBadge>;
}
