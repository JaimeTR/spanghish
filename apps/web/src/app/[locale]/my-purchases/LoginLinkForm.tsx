"use client";

import { useActionState } from "react";
import { sendLoginLink, type LoginLinkState } from "./actions";

type Labels = { email: string; submit: string; sent: string; invalid: string; failed: string };

export function LoginLinkForm({ locale, labels, buttonClass }: { locale: string; labels: Labels; buttonClass: string }) {
  const [state, action, pending] = useActionState<LoginLinkState, FormData>(sendLoginLink, { status: "idle" });
  if (state.status === "sent") return <p role="status" className="max-w-[60ch] text-lg font-semibold text-ink">{labels.sent}</p>;
  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="purchases-email" className="font-semibold text-ink">{labels.email}</label>
      <input
        id="purchases-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        className="min-h-11 rounded-lg border-2 border-ink bg-white px-3 text-ink"
      />
      {state.status === "invalid" || state.status === "failed" ? (
        <p role="alert" className="font-semibold text-brand-burgundy">{state.status === "invalid" ? labels.invalid : labels.failed}</p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonClass}>{labels.submit}</button>
    </form>
  );
}
