import { NextResponse, type NextRequest } from "next/server";
import { isLocale, routing } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/** Destino del enlace del correo: canjea el código por la sesión y lleva a "Mis compras". */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const asked = searchParams.get("locale") ?? "";
  const locale = isLocale(asked) ? asked : routing.defaultLocale;
  const code = searchParams.get("code");
  const supabase = await createClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${localePath(locale, "myPurchases")}`);
  }
  return NextResponse.redirect(`${origin}${localePath(locale, "myPurchases")}?error=link`);
}
