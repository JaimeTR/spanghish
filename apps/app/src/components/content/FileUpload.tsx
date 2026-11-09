"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import { attachUpload, requestUpload } from "@/app/[locale]/(shell)/admin/resources/upload-actions";
import type { UploadTarget } from "@/lib/uploads";
import { useFormAction } from "@/components/forms/useFormAction";
import { FormStatus } from "@/components/forms/FormStatus";
import { removeResourceFile } from "@/app/[locale]/(shell)/admin/resources/upload-actions";

export function FileUpload({ ownerId, target, accept, maxBytes, currentLabel, locale = "es", onUploaded, allowRemove = false }: { ownerId: string; target: UploadTarget; accept: string; maxBytes: number; currentLabel?: string; locale?: string; onUploaded?: (path: string, width?: number, height?: number) => void; allowRemove?: boolean }) {
  const t = useTranslations("content.upload"); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const remove = useFormAction(removeResourceFile);
  async function upload(file?: File) {
    if (!file) return;
    if (!accept.split(",").includes(file.type)) { setMessage(t("type")); return; }
    if (file.size > maxBytes) { setMessage(t("size")); return; }
    setBusy(true); setMessage(t("uploading"));
    try {
      const requested = await requestUpload({ ownerId, target, fileName: file.name, mime: file.type, size: file.size });
      if (!requested.ok) { setMessage(t(requested.error)); return; }
      const result = await createClient().storage.from(requested.bucket).uploadToSignedUrl(requested.path, requested.token, file);
      if (result.error) { setMessage(t("unavailable")); return; }
      let dimensions: { width?: number; height?: number } = {};
      if (file.type.startsWith("image/")) { const image = await createImageBitmap(file); dimensions = { width: image.width, height: image.height }; image.close(); }
      const attached = await attachUpload({ ownerId, target, path: requested.path, mime: file.type, size: file.size, ...dimensions, locale });
      if (attached.status === "ok") onUploaded?.(requested.path, dimensions.width, dimensions.height);
      setMessage(attached.status === "ok" ? t("uploaded") : attached.status === "error" ? t(attached.error === "not_found" ? "missing" : "unavailable") : t("unavailable"));
    } catch { setMessage(t("unavailable")); } finally { setBusy(false); }
  }
  return <div className="grid gap-2"><label className="font-semibold">{t("current")}</label>{currentLabel ? <p>{currentLabel}</p> : <p>{t("none")}</p>}{allowRemove && currentLabel ? <form action={remove.formAction}><input type="hidden" name="id" value={ownerId} /><input type="hidden" name="locale" value={locale} /><button type="submit" className="min-h-11 justify-self-start underline">{t("remove")}</button><FormStatus state={remove.state} /></form> : null}<input aria-label={t("choose")} type="file" accept={accept} disabled={busy} onChange={(event) => void upload(event.currentTarget.files?.[0])} /><p className="text-sm text-text-muted">{t("requiresJs")}</p><p aria-live="polite" role="status">{message}</p></div>;
}
