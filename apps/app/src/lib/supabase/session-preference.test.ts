import { describe, expect, it } from "vitest";
import { withSessionPreference } from "./session-preference";

const persistent = { path: "/", maxAge: 400 * 24 * 3600, sameSite: "lax" as const };

describe("withSessionPreference", () => {
  it("keeps the options untouched when the person asked to be remembered", () => {
    expect(withSessionPreference("token", persistent, false)).toBe(persistent);
  });

  it("drops maxAge and expires for a session-only cookie and keeps the rest", () => {
    const options = { ...persistent, expires: new Date(Date.now() + 86_400_000) };
    expect(withSessionPreference("token", options, true)).toEqual({ path: "/", sameSite: "lax" });
  });

  it("never turns a deletion into a session cookie", () => {
    expect(withSessionPreference("", persistent, true)).toBe(persistent);
    const gone = { path: "/", maxAge: 0 };
    expect(withSessionPreference("token", gone, true)).toBe(gone);
    const past = { path: "/", expires: new Date(0) };
    expect(withSessionPreference("token", past, true)).toBe(past);
  });

  it("does not mutate its input", () => {
    const options = { ...persistent };
    withSessionPreference("token", options, true);
    expect(options.maxAge).toBe(400 * 24 * 3600);
  });
});
