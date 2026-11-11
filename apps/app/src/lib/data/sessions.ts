import type { Database } from "@spanglish/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, schoolDayRange } from "../time";

type Client = SupabaseClient<Database>;

/** Clases de la semana que empieza el lunes `start` (RLS decide cuáles ve cada rol). */
export async function listWeekSessions(supabase: Client, start: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, starts_at, ends_at, status, teacher_id, cancel_reason, groups(name, code), attendance(id)")
    .gte("starts_at", schoolDayRange(start).from)
    .lt("starts_at", schoolDayRange(addDays(start, 6)).to)
    .order("starts_at");
  if (error) throw new Error(`sessions: ${error.code}`);
  return data;
}
