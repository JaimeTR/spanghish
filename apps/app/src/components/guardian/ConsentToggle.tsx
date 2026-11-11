"use client";

import { useTranslations } from "next-intl";
import { FormStatus } from "@/components/forms/FormStatus";
import { useFormAction } from "@/components/forms/useFormAction";
import { setConsent } from "@/lib/guardian/actions";

/** Dar o retirar un consentimiento de un hijo. Siempre agrega un registro nuevo: el último manda. */
export function ConsentToggle({ locale, studentId, kind, granted }: { locale: string; studentId: string; kind: "recordings" | "photos"; granted: boolean }) {
  const t = useTranslations("guardian.consents");
  const form = useFormAction(setConsent);
  return (
    <form action={form.formAction} className="mt-3 flex flex-wrap items-center gap-3">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="granted" value={granted ? "false" : "true"} />
      <button
        type="submit"
        className={`inline-flex min-h-11 items-center rounded-md px-5 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple ${
          granted ? "border border-line bg-surface text-text hover:bg-surface-sunken" : "bg-primary text-on-primary hover:bg-primary-hover"
        }`}
      >
        {granted ? t("withdraw") : t("grant")}
      </button>
      <FormStatus state={form.state} />
    </form>
  );
}
