import "server-only";
import type { Database, Tables } from "@spanglish/db";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

export type LocationRow = Tables<"locations">;
export type ProgramRow = Tables<"programs">;
export type EditionRow = Tables<"program_editions">;
export type PriceRow = Tables<"program_prices">;
export type LevelRow = Tables<"levels">;
export type ProgramWithEditions = ProgramRow & { program_editions: EditionRow[]; program_prices: PriceRow[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Para ids que vienen de la URL: un id mal formado es "no existe" (404), no un error 500. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

function fail(scope: string, error: { code?: string }): never {
  throw new Error(`${scope}: ${error.code ?? "error"}`);
}

export async function listLocations(supabase: Client): Promise<LocationRow[]> {
  const { data, error } = await supabase.from("locations").select("*").order("active", { ascending: false }).order("name");
  if (error) fail("listLocations", error);
  return data;
}

export async function listPrograms(supabase: Client, filter: { active?: boolean } = {}): Promise<ProgramRow[]> {
  let query = supabase.from("programs").select("*");
  if (filter.active !== undefined) query = query.eq("active", filter.active);
  const { data, error } = await query.order("active", { ascending: false }).order("code");
  if (error) fail("listPrograms", error);
  return data;
}

/** Programa con ediciones (por fecha) y precios; null si no existe o RLS no deja verlo. */
export async function getProgram(supabase: Client, id: string): Promise<ProgramWithEditions | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from("programs")
    .select("*, program_editions(*), program_prices(*)")
    .eq("id", id)
    .order("starts_on", { referencedTable: "program_editions" })
    .order("created_at", { referencedTable: "program_prices" })
    .maybeSingle();
  if (error) fail("getProgram", error);
  return data;
}

export async function listLevels(supabase: Client): Promise<LevelRow[]> {
  const { data, error } = await supabase.from("levels").select("*").order("language_code").order("sort");
  if (error) fail("listLevels", error);
  return data;
}

export async function listLanguages(supabase: Client): Promise<Tables<"languages">[]> {
  const { data, error } = await supabase.from("languages").select("*").eq("active", true).order("code");
  if (error) fail("listLanguages", error);
  return data;
}
