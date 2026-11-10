import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/routing";
import { isUuid } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; resourceId: string }> }) {
  const { locale: rawLocale, resourceId } = await params;
  if (!isLocale(rawLocale)) return new Response(null, { status: 404 });
  await requireArea(rawLocale, "student");
  if (!isUuid(resourceId)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("resource_file_path", { p_resource_id: resourceId });
  if (error) throw new Error(`resource_file_path: ${error.code}`);
  if (!path) return new Response(null, { status: 404 });
  const filename = path.split("/").at(-1) ?? "resource";
  const { data, error: storageError } = await supabase.storage.from("resource-files").createSignedUrl(path, 300, { download: filename });
  if (storageError || !data?.signedUrl) return new Response(null, { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 303, headers: { "Cache-Control": "private, no-store" } });
}
