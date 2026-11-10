"use client";

import { UserCheck, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormStatus } from "@/components/forms/FormStatus";
import { IconSubmit } from "@/components/ui/IconButton";
import type { ActionState } from "@/lib/forms";
import { setStudentStatus } from "./actions";

/** Activar o desactivar un alumno desde la lista: solo icono (el texto es el nombre accesible y el tooltip). */
export function StudentStatusButton({ studentId, locale, active }: { studentId: string; locale: string; active: boolean }) {
  const t = useTranslations("students.actions");
  const [state, action] = useActionState<ActionState, FormData>(setStudentStatus, { status: "idle" });
  return (
    <form action={action}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="status" value={active ? "inactive" : "active"} />
      <IconSubmit
        tone={active ? "danger" : "primary"}
        label={active ? t("deactivate") : t("activate")}
        icon={active ? <UserX className="size-5" strokeWidth={1.75} /> : <UserCheck className="size-5" strokeWidth={1.75} />}
      />
      <FormStatus state={state} />
    </form>
  );
}
