"use client";

import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { ASSIGNMENT_FILE_TYPES, ASSIGNMENT_MAX_BYTES } from "@/lib/assignments/files";
import { requestSubmissionUpload, submitAssignment, type SubmitField } from "@/lib/assignments/actions";
import { createClient } from "@/lib/supabase/browser";

/**
 * Entrega de una tarea: texto y/o un archivo. El archivo sube directo a Storage con una URL firmada
 * (no pasa por el servidor, que tiene un límite de tamaño); después se guarda la entrega con su ruta.
 * Se puede reenviar mientras la docente no la haya calificado.
 */
export function SubmissionForm({
  locale,
  assignmentId,
  studentId,
  initialText,
  initialFileName,
  hasFile,
}: {
  locale: string;
  assignmentId: string;
  studentId: string;
  initialText: string | null;
  initialFileName: string | null;
  hasFile: boolean;
}) {
  const t = useTranslations("assignments.submit");
  const form = useFormAction<SubmitField>(submitAssignment, { status: "idle" }, true);
  const input = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<{ path: string; name: string } | null>(null);
  const [keep, setKeep] = useState(hasFile);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose(file?: File) {
    if (!file) return;
    setProblem(null);
    if (!ASSIGNMENT_FILE_TYPES.includes(file.type)) return setProblem(t("errors.type"));
    if (file.size > ASSIGNMENT_MAX_BYTES) return setProblem(t("errors.size"));
    setBusy(true);
    try {
      const req = await requestSubmissionUpload({ assignmentId, studentId, mime: file.type, size: file.size });
      if (!req.ok) return setProblem(req.error === "type" || req.error === "size" ? t(`errors.${req.error}`) : t("errors.upload"));
      const sent = await createClient().storage.from("assignment-files").uploadToSignedUrl(req.path, req.token, file);
      if (sent.error) return setProblem(t("errors.upload"));
      setUploaded({ path: req.path, name: file.name });
    } catch {
      setProblem(t("errors.upload"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const fileLabel = uploaded?.name ?? (keep ? initialFileName : null);

  return (
    <form
      action={form.formAction}
      noValidate
      className="space-y-4 rounded-lg border border-line bg-surface p-5"
    >
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="studentId" value={studentId} />
      {uploaded ? (
        <>
          <input type="hidden" name="filePath" value={uploaded.path} />
          <input type="hidden" name="fileName" value={uploaded.name} />
        </>
      ) : keep ? (
        <input type="hidden" name="keepFile" value="on" />
      ) : null}
      <div key={form.formKey}>
        <Field idPrefix="submit-" name="textAnswer" label={t("text")} hint={t("textHint")} error={form.fieldErrors.textAnswer}>
          <textarea rows={6} maxLength={5000} defaultValue={form.value("textAnswer", initialText)} className={inputClass} />
        </Field>
      </div>
      <div>
        <p className="text-sm font-semibold text-text">{t("file")}</p>
        <p className="text-sm text-text-muted">{t("fileHint")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input ref={input} type="file" accept={ASSIGNMENT_FILE_TYPES.join(",")} className="sr-only" id="submit-file" onChange={(e) => void choose(e.target.files?.[0])} />
          <label
            htmlFor="submit-file"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line px-4 font-semibold text-text hover:bg-surface-sunken focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand-purple"
          >
            <Paperclip aria-hidden="true" className="size-4" />
            {busy ? t("uploading") : fileLabel ? t("changeFile") : t("attach")}
          </label>
          {fileLabel ? (
            <span className="text-sm text-text">
              {fileLabel}
              <button
                type="button"
                onClick={() => {
                  setUploaded(null);
                  setKeep(false);
                }}
                className="ml-3 font-semibold text-structure underline"
              >
                {t("removeFile")}
              </button>
            </span>
          ) : null}
        </div>
        {problem ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-danger">
            {problem}
          </p>
        ) : null}
      </div>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("sending")}>{initialText || hasFile ? t("resend") : t("send")}</SubmitButton>
    </form>
  );
}
