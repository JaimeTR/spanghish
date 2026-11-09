"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { ActionState } from "@/lib/forms";
import { setAccountSuspended } from "./actions";

export function SuspendForm({
  locale,
  userId,
  name,
  suspended,
}: {
  locale: string;
  userId: string;
  name: string;
  suspended: boolean;
}) {
  const t = useTranslations("teachers");
  const [state, action] = useActionState<ActionState<"userId" | "suspended">, FormData>(
    setAccountSuspended,
    { status: "idle" },
  );

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="suspended" value={suspended ? "false" : "true"} />
      <SubmitButton variant="secondary" pendingLabel={t("saving")}>
        {suspended ? t("reactivate") : t("suspend")}
        <span className="sr-only"> {t("who", { name })}</span>
      </SubmitButton>
      <FormStatus state={state} />
    </form>
  );
}
