import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { loadSessionUser } from "./load-session-user";

type Fake = {
  user?: { id: string } | null;
  status?: { data: unknown; error: unknown };
  profile?: { data: unknown; error: unknown };
  roles?: { data: unknown; error: unknown };
};

function fakeClient(f: Fake): SupabaseClient {
  const query = (result: { data: unknown; error: unknown }) => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    return q;
  };
  return {
    auth: {
      getUser: () =>
        Promise.resolve(
          f.user ? { data: { user: f.user }, error: null } : { data: { user: null }, error: {} },
        ),
    },
    rpc: () => Promise.resolve(f.status ?? { data: null, error: null }),
    from: (table: string) =>
      query(
        table === "profiles"
          ? (f.profile ?? { data: null, error: null })
          : (f.roles ?? { data: [], error: null }),
      ),
  } as unknown as SupabaseClient;
}

const ID = "a0000000-0000-4000-8000-000000000003";

describe("loadSessionUser", () => {
  it("returns null without a session", async () => {
    expect(await loadSessionUser(fakeClient({ user: null }))).toBeNull();
  });

  it("returns roles for an active user", async () => {
    const user = await loadSessionUser(
      fakeClient({
        user: { id: ID },
        status: { data: "active", error: null },
        profile: { data: { id: ID, status: "active", preferred_locale: "en" }, error: null },
        roles: { data: [{ role: "student" }], error: null },
      }),
    );
    expect(user).toEqual({ id: ID, roles: ["student"], status: "active", locale: "en" });
  });

  it("marks a suspended user without roles", async () => {
    const user = await loadSessionUser(
      fakeClient({ user: { id: ID }, status: { data: "suspended", error: null } }),
    );
    expect(user).toEqual({ id: ID, roles: [], status: "suspended", locale: "es" });
  });

  it("gives a user without profile a distinct fail-closed status", async () => {
    const user = await loadSessionUser(
      fakeClient({ user: { id: ID }, status: { data: null, error: null } }),
    );
    expect(user).toEqual({ id: ID, roles: [], status: "no_profile", locale: "es" });
  });

  it("returns null (no access, no sign-out) on database errors", async () => {
    expect(
      await loadSessionUser(fakeClient({ user: { id: ID }, status: { data: null, error: {} } })),
    ).toBeNull();
    expect(
      await loadSessionUser(
        fakeClient({
          user: { id: ID },
          status: { data: "active", error: null },
          profile: { data: null, error: { message: "boom" } },
        }),
      ),
    ).toBeNull();
  });
});
