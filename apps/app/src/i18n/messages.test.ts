import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { DOMAIN_ERRORS } from "../lib/db-errors";
import { FORM_ERROR_KEYS } from "../lib/forms";

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

function lookup(messages: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
      messages,
    );
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(tsx?|jsx?)$/.test(entry.name) ? [path] : [];
  });
}

describe("messages", () => {
  it("es and en messages have identical keys", () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });

  it("every DomainError has a message in es and en", () => {
    for (const code of DOMAIN_ERRORS) {
      for (const messages of [es, en]) {
        const text = lookup(messages, `errors.domain.${code}`);
        expect(typeof text, code).toBe("string");
        expect((text as string).length, code).toBeGreaterThan(0);
      }
    }
  });

  it("every form error key has a message in es and en", () => {
    for (const key of FORM_ERROR_KEYS) {
      for (const messages of [es, en]) {
        expect(typeof lookup(messages, `forms.errors.${key}`), key).toBe("string");
      }
    }
  });

  it("admin resource and lesson page translation calls exist in both locales", () => {
    const appRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
    const adminRoot = join(appRoot, "src", "app", "[locale]", "(shell)", "admin");
    const files = [
      ...["resources", "lessons"].flatMap((area) => sourceFiles(join(adminRoot, area))),
      join(appRoot, "src", "components", "content", "FileUpload.tsx"),
    ];
    const namespaces = ["content.resources", "content.lessons", "content.blocks", "content.upload"];
    const dynamicKeys: Record<string, string[]> = {
      "content.resources": [
        "kindNames.video", "kindNames.document", "kindNames.link", "kindNames.worksheet",
        "kindNames.vocabulary", "kindNames.recording", "kindNames.coursework",
        "levelNames.public", "levelNames.account", "levelNames.enrolled",
        "statusNames.draft", "statusNames.published",
        "audiences.kids", "audiences.adults", "audiences.mature",
      ],
      "content.lessons": [
        "previewDraft",
        "categoryNames.foundations", "categoryNames.kids", "categoryNames.adults",
        "categoryNames.stories", "categoryNames.games", "kindNames.article",
        "kindNames.interactive", "levelAccess.public", "levelAccess.account",
        "levelAccess.enrolled", "statusNames.draft", "statusNames.published",
      ],
      "content.blocks": ["text", "image", "video", "quiz", "videoTitle", "playVideo"],
      "content.upload": ["forbidden"],
    };
    const missing: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const declared = [...source.matchAll(/useTranslations\(["']([^"']+)["']\)|namespace:\s*["']([^"']+)["']/g)]
        .map((match) => match[1] ?? match[2] ?? "")
        .filter((namespace): namespace is string => namespaces.includes(namespace));
      const calls = [...source.matchAll(/\bt(?:\.rich|\.has)?\(\s*(["'])([^"']+)\1/g)];
      for (const namespace of declared) {
        for (const key of dynamicKeys[namespace] ?? []) {
          const fullKey = `${namespace}.${key}`;
          if (lookup(es, fullKey) === undefined) missing.push(`${relative(appRoot, file)}: ${fullKey} (es)`);
          if (lookup(en, fullKey) === undefined) missing.push(`${relative(appRoot, file)}: ${fullKey} (en)`);
        }
        // In files with multiple translation namespaces, a simple t(...) scan cannot
        // associate each call with its alias. Their bounded dynamic keys are checked above.
        if (declared.length === 1) {
          for (const call of calls) {
            const key = call[2];
            if (key === undefined) continue;
            const fullKey = `${namespace}.${key}`;
            if (lookup(es, fullKey) === undefined) missing.push(`${relative(appRoot, file)}: ${fullKey} (es)`);
            if (lookup(en, fullKey) === undefined) missing.push(`${relative(appRoot, file)}: ${fullKey} (en)`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
