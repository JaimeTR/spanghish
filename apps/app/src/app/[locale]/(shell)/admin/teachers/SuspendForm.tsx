"use client";

import { UserCheck, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormStatus } from "@/components/forms/FormStatus";
import { IconSubmit } from "@/components/ui/IconButton";
import type { ActionState } from "@/lib/forms";
import { setAccountSuspended } from "./actions";

/** Suspender o reactivar una cuenta desde la lista: solo icono (el texto es el nombre accesible y el tooltip). */
export function SuspendForm({
  locale,
  userId,
  suspended,
}: {
  locale: string;
  userId: string;
  suspended: boolean;
}) {
  const t = useTranslations("teachers");
  const [state, action] = useActionState<ActionState<"userId" | "suspended">, FormData>(
    setAccountSuspended,
    { status: "idle" },
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="suspended" value={suspended ? "false" : "true"} />
      <IconSubmit
        tone={suspended ? "primary" : "danger"}
        label={suspended ? t("reactivate") : t("suspend")}
        icon={suspended ? <UserCheck className="size-5" strokeWidth={1.75} /> : <UserX className="size-5" strokeWidth={1.75} />}
      />
      <FormStatus state={state} />
    </form>
  );
}
