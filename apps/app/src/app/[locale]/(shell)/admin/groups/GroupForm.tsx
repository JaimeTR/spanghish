"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { Checkbox } from "@/components/forms/Checkbox";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { deleteGroup, saveGroup, type GroupField } from "./actions";

export type GroupOptions = {
  programs: { id: string; name: string; format: string }[];
  editions: { id: string; programId: string; label: string }[];
  teachers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
};

export type GroupValues = {
  id: string;
  code: string;
  name: string;
  program_id: string;
  edition_id: string | null;
  teacher_id: string | null;
  location_id: string | null;
  location_note: string | null;
  meeting_url: string | null;
  format: string;
  capacity: number;
  status: string;
  is_public: boolean;
};

const FORMATS = ["individual", "own_group", "local_group"] as const;
const STATUSES = ["draft", "active", "completed", "cancelled"] as const;

/** Alta y edición de un grupo. Las ediciones se filtran por el programa elegido. */
export function GroupForm({ locale, options, group }: { locale: string; options: GroupOptions; group?: GroupValues }) {
  const t = useTranslations("adminGroups");
  const form = useFormAction<GroupField>(saveGroup, { status: "idle" }, Boolean(group));
  const errors = form.fieldErrors;
  const prefix = `group-${group?.id ?? "new"}-`;
  const [programId, setProgramId] = useState(form.value("programId", group?.program_id) ?? "");
  const editions = options.editions.filter((e) => e.programId === programId);

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <input type="hidden" name="uiLocale" value={locale} />
      {group ? <input type="hidden" name="id" value={group.id} /> : null}
      <div key={form.formKey} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <Field idPrefix={prefix} name="code" label={t("form.code")} hint={t("form.codeHint")} error={errors.code}>
            <input type="text" maxLength={30} autoCapitalize="characters" defaultValue={form.value("code", group?.code)} className={`${inputClass} uppercase`} />
          </Field>
          <Field idPrefix={prefix} name="name" label={t("form.name")} error={errors.name}>
            <input type="text" maxLength={120} defaultValue={form.value("name", group?.name)} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field idPrefix={prefix} name="programId" label={t("form.program")} error={errors.programId}>
            <select value={programId} onChange={(e) => setProgramId(e.target.value)} className={inputClass}>
              <option value="">{t("form.choose")}</option>
              {options.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field idPrefix={prefix} name="editionId" label={t("form.edition")} hint={t("form.editionHint")} error={errors.editionId}>
            <select key={programId} defaultValue={form.value("editionId", group?.program_id === programId ? group?.edition_id : null) ?? ""} className={inputClass}>
              <option value="">{t("form.none")}</option>
              {editions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field idPrefix={prefix} name="teacherId" label={t("form.teacher")} error={errors.teacherId}>
            <select defaultValue={form.value("teacherId", group?.teacher_id) ?? ""} className={inputClass}>
              <option value="">{t("form.unassigned")}</option>
              {options.teachers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field idPrefix={prefix} name="locationId" label={t("form.location")} error={errors.locationId}>
            <select defaultValue={form.value("locationId", group?.location_id) ?? ""} className={inputClass}>
              <option value="">{t("form.none")}</option>
              {options.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field idPrefix={prefix} name="locationNote" label={t("form.locationNote")} error={errors.locationNote}>
            <input type="text" maxLength={300} defaultValue={form.value("locationNote", group?.location_note)} className={inputClass} />
          </Field>
          <Field idPrefix={prefix} name="meetingUrl" label={t("form.meetingUrl")} hint={t("form.meetingUrlHint")} error={errors.meetingUrl}>
            <input type="url" maxLength={500} defaultValue={form.value("meetingUrl", group?.meeting_url)} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field idPrefix={prefix} name="format" label={t("form.format")} error={errors.format}>
            <select defaultValue={form.value("format", group?.format ?? "local_group")} className={inputClass}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t(`format.${f}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field idPrefix={prefix} name="capacity" label={t("form.capacity")} hint={t("form.capacityHint")} error={errors.capacity}>
            <input type="number" min={1} max={30} inputMode="numeric" defaultValue={form.value("capacity", group?.capacity ?? 8)} className={inputClass} />
          </Field>
          <Field idPrefix={prefix} name="status" label={t("form.status")} error={errors.status}>
            <select defaultValue={form.value("status", group?.status ?? "active")} className={inputClass}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Checkbox idPrefix={prefix} name="isPublic" label={t("form.isPublic")} hint={t("form.isPublicHint")} defaultChecked={form.checked("isPublic", group?.is_public ?? false)} />
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("form.saving")}>{group ? t("form.save") : t("form.create")}</SubmitButton>
    </form>
  );
}

export function GroupDelete({ id, locale }: { id: string; locale: string }) {
  const t = useTranslations("adminGroups");
  const ts = useTranslations("shell");
  const form = useFormAction(deleteGroup);
  return (
    <form action={form.formAction}>
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <ConfirmDelete label={t("delete")} confirmLabel={ts("sure")} cancelLabel={ts("cancel")} />
      <FormStatus state={form.state} />
    </form>
  );
}
