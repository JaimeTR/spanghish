"use client";

import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { BilingualField } from "@/components/forms/BilingualField";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import type { Locale } from "@/i18n/routing";
import type { ProductField } from "@/lib/schemas/products";
import { saveProduct } from "./actions";

export type ProductValues = {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  summary_es: string | null;
  summary_en: string | null;
  price_cents: number;
  compare_at_cents: number | null;
};

const dollars = (cents: number | null | undefined) => (cents == null ? undefined : (cents / 100).toFixed(2));

/** Datos de un producto: nombre, descripción y precio (en dólares australianos). */
export function ProductForm({ locale, product }: { locale: Locale; product?: ProductValues }) {
  const t = useTranslations("products.form");
  const form = useFormAction<ProductField>(saveProduct, { status: "idle" }, Boolean(product));
  const errors = form.fieldErrors;
  return (
    <form action={form.formAction} noValidate className="space-y-5">
      <input type="hidden" name="uiLocale" value={locale} />
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div key={form.formKey} className="space-y-5">
        <BilingualField
          name="name"
          label={t("name")}
          maxLength={120}
          errors={errors}
          defaultValues={{ es: form.value("nameEs", product?.name_es), en: form.value("nameEn", product?.name_en) }}
        />
        <BilingualField
          name="summary"
          label={t("summary")}
          maxLength={800}
          multiline
          errors={errors}
          defaultValues={{ es: form.value("summaryEs", product?.summary_es), en: form.value("summaryEn", product?.summary_en) }}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="slug" label={t("slug")} error={errors.slug} hint={t("slugHint")}>
            <input type="text" maxLength={60} defaultValue={form.value("slug", product?.slug)} className={inputClass} />
          </Field>
          <Field name="price" label={t("price")} error={errors.price} hint={t("priceHint")}>
            <input type="text" inputMode="decimal" defaultValue={form.value("price", dollars(product?.price_cents))} className={inputClass} />
          </Field>
          <Field name="compareAt" label={t("compareAt")} error={errors.compareAt} hint={t("compareAtHint")}>
            <input type="text" inputMode="decimal" defaultValue={form.value("compareAt", dollars(product?.compare_at_cents))} className={inputClass} />
          </Field>
        </div>
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{product ? t("save") : t("create")}</SubmitButton>
    </form>
  );
}
