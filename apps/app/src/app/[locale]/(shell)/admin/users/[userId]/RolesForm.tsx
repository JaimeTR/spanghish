"use client";

import { useTranslations } from "next-intl";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { APP_ROLES } from "@/lib/schemas/people";
import { saveUserRoles } from "../actions";

/** Roles de una cuenta: casillas; debe quedar al menos uno y la base protege a la última administradora. */
export function RolesForm({ locale, userId, roles }: { locale: string; userId: string; roles: string[] }) {
  const t = useTranslations("users.roles");
  const ta = useTranslations("areas");
  const form = useFormAction(saveUserRoles, { status: "idle" }, true);

  return (
    <form action={form.formAction} className="space-y-3">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <fieldset>
        <legend className="mb-2 text-sm text-text-muted">{t("help")}</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {APP_ROLES.map((r) => (
            <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 text-text">
              <input type="checkbox" name="role" value={r} defaultChecked={roles.includes(r)} className="size-5" />
              <span>
                {ta(r)}
                <span className="block text-xs text-text-muted">{t(`desc.${r}`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
