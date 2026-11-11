import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Descarga de un archivo comprado: solo si la sesión es la dueña del pedido (RPC + política de Storage). */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const supabase = await createClient();
  if (!supabase) return new NextResponse(null, { status: 404 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse(null, { status: 401 });
  const { data } = await supabase.rpc("my_shop_purchases");
  const raw = Array.isArray(data) ? data : [];
  const row = raw
    .flatMap((o) => (o && typeof o === "object" && Array.isArray((o as { items?: unknown }).items) ? ((o as { items: unknown[] }).items as Record<string, unknown>[]) : []))
    .find((i) => i.item_id === itemId);
  const path = row && typeof row.file_path === "string" ? row.file_path : null;
  if (!path) return new NextResponse(null, { status: 404 });
  const name = typeof row?.file_name === "string" ? row.file_name : true;
  const { data: signed, error } = await supabase.storage.from("product-files").createSignedUrl(path, 60, { download: name });
  if (error || !signed) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
