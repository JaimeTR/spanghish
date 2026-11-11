"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/browser";
import { attachAvatar, removeAvatar, requestAvatarUpload } from "./avatar-actions";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2_097_152;

const btn =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 font-semibold text-text hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:opacity-60";

/** Cambiar o quitar la foto de perfil (la propia, o la de otra cuenta si eres administración). */
export function AvatarUploader({
  locale,
  userId,
  name,
  initialPath,
}: {
  locale: string;
  userId?: string;
  name?: string | null;
  initialPath?: string | null;
}) {
  const t = useTranslations("account.avatar");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(initialPath ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const fail = (key: string) => setMessage({ text: t(key), error: true });

  async function upload(file?: File) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return fail("type");
    if (file.size > MAX_BYTES) return fail("size");
    setBusy(true);
    setMessage(null);
    try {
      const req = await requestAvatarUpload({ userId, mime: file.type, size: file.size });
      if (!req.ok) return fail(req.error === "type" || req.error === "size" ? req.error : "error");
      const sent = await createClient().storage.from("content-media").uploadToSignedUrl(req.path, req.token, file);
      if (sent.error) return fail("error");
      const done = await attachAvatar({ userId, path: req.path, locale });
      if (!done.ok) return fail("error");
      setPath(req.path);
      setMessage({ text: t("saved"), error: false });
      router.refresh();
    } catch {
      fail("error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    const done = await removeAvatar({ userId, locale });
    setBusy(false);
    if (!done.ok) return fail("error");
    setPath(null);
    setMessage({ text: t("removed"), error: false });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar path={path} name={name} size={96} />
      <div className="min-w-0">
        <p className="text-sm text-text-muted">{t("help")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={btn}>
            <Camera aria-hidden="true" className="size-4" /> {busy ? t("uploading") : path ? t("change") : t("upload")}
          </button>
          {path ? (
            <button type="button" disabled={busy} onClick={remove} className={btn}>
              <Trash2 aria-hidden="true" className="size-4" /> {t("remove")}
            </button>
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept={TYPES.join(",")}
          className="sr-only"
          aria-label={t("choose")}
          tabIndex={-1}
          onChange={(e) => void upload(e.currentTarget.files?.[0])}
        />
        <p role="status" className={`mt-2 min-h-5 text-sm font-semibold ${message?.error ? "text-danger" : "text-text"}`}>
          {message?.text ?? ""}
        </p>
      </div>
    </div>
  );
}
