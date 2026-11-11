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

/** Cierres (festivos) que tocan la semana que empieza el lunes `start`. */
export async function listWeekClosures(supabase: Client, start: string) {
  const end = addDays(start, 6);
  const { data, error } = await supabase.from("closures").select("id, starts_on, ends_on, location_id, reason_es, reason_en, locations(name)").lte("starts_on", end).gte("ends_on", start);
  if (error) throw new Error(`closures: ${error.code}`);
  return data;
}
