import { readFileSync } from "node:fs";
import path from "node:path";
import { envExampleNames, missingFromReference, secretLookalikes } from "@spanglish/content";
import { describe, expect, it } from "vitest";
import { WEB_ENV_NAMES } from "./env";

const root = path.resolve(__dirname, "../../../..");
const doc = readFileSync(path.join(root, "docs/despliegue.md"), "utf8");
const example = readFileSync(path.join(root, ".env.example"), "utf8");

describe("docs/despliegue.md (web)", () => {
  it("documents every variable the web env check reads", () => {
    expect(missingFromReference(doc, WEB_ENV_NAMES)).toEqual([]);
  });

  it("documents every variable in .env.example", () => {
    expect(missingFromReference(doc, envExampleNames(example))).toEqual([]);
  });

  it(".env.example lists every variable the web reads", () => {
    const listed = envExampleNames(example);
    expect(WEB_ENV_NAMES.filter((name) => !listed.includes(name))).toEqual([]);
  });

  it("neither file contains anything that looks like a real key", () => {
    expect(secretLookalikes(doc)).toEqual([]);
    expect(secretLookalikes(example)).toEqual([]);
  });
});
