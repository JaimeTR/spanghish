"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { inputClass } from "@/components/form-styles";
import { FormStatus } from "@/components/forms/FormStatus";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useFormAction } from "@/components/forms/useFormAction";
import { setTestShares } from "../actions";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Con quién se comparte un test privado: lista con buscador y casillas (la selección se conserva al filtrar). */
export function ShareForm({
  locale,
  testId,
  people,
  selected,
}: {
  locale: string;
  testId: string;
  people: { id: string; label: string }[];
  selected: string[];
}) {
  const t = useTranslations("tests.share");
  const form = useFormAction(setTestShares, { status: "idle" }, true);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState(() => new Set(selected));
  const visible = useMemo(() => {
    const q = norm(query.trim());
    return q ? people.filter((p) => norm(p.label).includes(q)) : people;
  }, [people, query]);

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={form.formAction} className="space-y-3">
      <input type="hidden" name="uiLocale" value={locale} />
      <input type="hidden" name="testId" value={testId} />
      {[...chosen].map((id) => (
        <input key={id} type="hidden" name="userId" value={id} />
      ))}
      <label className="block text-sm font-semibold text-text" htmlFor="share-search">
        {t("search")}
      </label>
      <input id="share-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} autoComplete="off" />
      <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-md border border-line">
        {visible.length === 0 ? <li className="p-3 text-sm text-text-muted">{t("none")}</li> : null}
        {visible.map((p) => (
          <li key={p.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 text-text">
              <input type="checkbox" checked={chosen.has(p.id)} onChange={() => toggle(p.id)} className="size-5 shrink-0" />
              <span className="min-w-0 break-words">{p.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <p role="status" className="text-sm text-text-muted">
        {t("count", { count: chosen.size })}
      </p>
      <FormStatus state={form.state} />
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
