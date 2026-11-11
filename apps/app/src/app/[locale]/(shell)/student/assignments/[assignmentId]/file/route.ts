import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/routing";
import { signSubmissionFile } from "@/lib/assignments/sign";
import { isUuid } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";

/** Descarga del archivo de MI entrega: URL firmada de 5 minutos (la política de Storage decide quién puede). */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; assignmentId: string }> }) {
  const { locale, assignmentId } = await params;
  if (!isLocale(locale) || !isUuid(assignmentId)) return new Response(null, { status: 404 });
  await requireArea(locale, "student");
  const url = await signSubmissionFile(assignmentId, null);
  if (!url) return new Response(null, { status: 404 });
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "private, no-store" } });
}
