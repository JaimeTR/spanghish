import "server-only";
import { cache } from "react";
import type { SessionUser } from "./access";
import { loadSessionUser } from "./load-session-user";
import { createClient } from "./supabase/server";

/** Una sola consulta por petición aunque la llamen el layout y la página. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  return loadSessionUser(await createClient());
});
