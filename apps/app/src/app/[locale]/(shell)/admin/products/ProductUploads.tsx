"use client";

import { FileUp, ImageUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { CoverThumb } from "@/components/content/Cover";
import {
  PRODUCT_COVER_MAX_BYTES,
  PRODUCT_COVER_TYPES,
  PRODUCT_FILE_MAX_BYTES,
  PRODUCT_FILE_TYPES,
} from "@/lib/schemas/products";
import { createClient } from "@/lib/supabase/browser";
import { attachProductUpload, removeProductUpload, requestProductUpload } from "./actions";

const btn =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 font-semibold text-text hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:opacity-60";

function formatSize(bytes: number): string {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Portada (pública) y archivo (privado) de un producto. */
export function ProductUploads({
  locale,
  productId,
  coverPath,
  fileName,
  fileSize,
}: {
  locale: string;
  productId: string;
  coverPath: string | null;
  fileName: string | null;
  fileSize: number | null;
}) {
  const t = useTranslations("products.uploads");
  const router = useRouter();
  const coverInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"cover" | "file" | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function upload(kind: "cover" | "file", file?: File) {
    if (!file) return;
    const types: readonly string[] = kind === "cover" ? PRODUCT_COVER_TYPES : PRODUCT_FILE_TYPES;
    const max = kind === "cover" ? PRODUCT_COVER_MAX_BYTES : PRODUCT_FILE_MAX_BYTES;
    if (!types.includes(file.type)) return setMessage({ text: t(`${kind}Type`), error: true });
    if (file.size > max) return setMessage({ text: t(`${kind}Size`), error: true });
    setBusy(kind);
    setMessage(null);
    try {
      const req = await requestProductUpload({ productId, kind, mime: file.type, size: file.size });
      if (!req.ok) return setMessage({ text: t("error"), error: true });
      const bucket = kind === "cover" ? "content-media" : "product-files";
      const sent = await createClient().storage.from(bucket).uploadToSignedUrl(req.path, req.token, file);
      if (sent.error) return setMessage({ text: t("error"), error: true });
      let dims: { width?: number; height?: number } = {};
      if (kind === "cover") {
        const bitmap = await createImageBitmap(file);
        dims = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
      }
      const done = await attachProductUpload({ productId, kind, path: req.path, fileName: file.name, size: file.size, locale, ...dims });
      if (!done.ok) return setMessage({ text: t("error"), error: true });
      setMessage({ text: t("saved"), error: false });
      router.refresh();
    } catch {
      setMessage({ text: t("error"), error: true });
    } finally {
      setBusy(null);
      if (coverInput.current) coverInput.current.value = "";
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(kind: "cover" | "file") {
    setBusy(kind);
    setMessage(null);
    const done = await removeProductUpload({ productId, kind, locale });
    setBusy(null);
    if (!done.ok) return setMessage({ text: t("error"), error: true });
    router.refresh();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="up-cover" className="rounded-md border border-line p-4">
        <h3 id="up-cover" className="mb-3 font-semibold text-text">
          {t("cover")}
        </h3>
        <div className="flex items-start gap-4">
          <CoverThumb path={coverPath} size={96} />
          <div className="min-w-0">
            <p className="mb-2 text-sm text-text-muted">{t("coverHelp")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy !== null} onClick={() => coverInput.current?.click()} className={btn}>
                <ImageUp aria-hidden="true" className="size-4" /> {busy === "cover" ? t("uploading") : coverPath ? t("change") : t("upload")}
              </button>
              {coverPath ? (
                <button type="button" disabled={busy !== null} onClick={() => remove("cover")} className={btn}>
                  <Trash2 aria-hidden="true" className="size-4" /> {t("remove")}
                </button>
              ) : null}
            </div>
            <input ref={coverInput} type="file" accept={PRODUCT_COVER_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-label={t("cover")} onChange={(e) => void upload("cover", e.currentTarget.files?.[0])} />
          </div>
        </div>
      </section>

      <section aria-labelledby="up-file" className="rounded-md border border-line p-4">
        <h3 id="up-file" className="mb-3 font-semibold text-text">
          {t("file")}
        </h3>
        <p className="mb-1 break-words text-text">{fileName ? `${fileName}${fileSize ? ` · ${formatSize(fileSize)}` : ""}` : t("noFile")}</p>
        <p className="mb-2 text-sm text-text-muted">{t("fileHelp")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy !== null} onClick={() => fileInput.current?.click()} className={btn}>
            <FileUp aria-hidden="true" className="size-4" /> {busy === "file" ? t("uploading") : fileName ? t("change") : t("upload")}
          </button>
          {fileName ? (
            <button type="button" disabled={busy !== null} onClick={() => remove("file")} className={btn}>
              <Trash2 aria-hidden="true" className="size-4" /> {t("remove")}
            </button>
          ) : null}
        </div>
        <input ref={fileInput} type="file" accept={PRODUCT_FILE_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-label={t("file")} onChange={(e) => void upload("file", e.currentTarget.files?.[0])} />
      </section>

      <p role="status" className={`md:col-span-2 min-h-5 text-sm font-semibold ${message?.error ? "text-danger" : "text-text"}`}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}
