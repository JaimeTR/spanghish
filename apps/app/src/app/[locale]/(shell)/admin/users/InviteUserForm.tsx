"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import { APP_ROLES } from "@/lib/schemas/people";
import { inviteUser, type InviteUserField } from "./actions";

/** Alta de una cuenta con el rol que se elija; la persona recibe un enlace para crear su contraseña. */
export function InviteUserForm({ locale, defaultRole = "student" }: { locale: Locale; defaultRole?: (typeof APP_ROLES)[number] }) {
  const t = useTranslations("users.invite");
  const ta = useTranslations("areas");
  const tl = useTranslations("locales");
  const form = useFormAction<InviteUserField>(inviteUser);
  const errors = form.fieldErrors;

  return (
    <form action={form.formAction} noValidate className="space-y-5">
      <input type="hidden" name="uiLocale" value={locale} />
      <div key={form.formKey} className="space-y-5">
        <Field name="fullName" label={t("fullName")} error={errors.fullName}>
          <input type="text" autoComplete="off" required maxLength={120} defaultValue={form.value("fullName")} className={inputClass} />
        </Field>
        <Field name="email" label={t("email")} error={errors.email} hint={t("emailHint")}>
          <input type="email" autoComplete="off" required maxLength={254} defaultValue={form.value("email")} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="role" label={t("role")} error={errors.role} hint={t("roleHint")}>
            <select defaultValue={form.value("role", defaultRole)} className={inputClass}>
              {APP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ta(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field name="locale" label={t("locale")} error={errors.locale}>
            <select defaultValue={form.value("locale", locale)} className={inputClass}>
              <option value="es">{tl("es")}</option>
              <option value="en">{tl("en")}</option>
            </select>
          </Field>
        </div>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("creating")}>{t("create")}</SubmitButton>
    </form>
  );
}
